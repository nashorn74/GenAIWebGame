#!/usr/bin/env python3
"""Light/heavy Socket.IO load reproduction test for CI."""

from __future__ import annotations

import argparse
import random
import string
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

import requests
import socketio


PASSWORD = "load1234"
MAP_KEY = "city2"


@dataclass(frozen=True)
class Profile:
    name: str
    clients: int
    same_tile_moves: int
    tile_change_moves: int
    interval_s: float
    timeout_s: float


PROFILES = {
    "light": Profile(
        name="light",
        clients=3,
        same_tile_moves=12,
        tile_change_moves=8,
        interval_s=0.02,
        timeout_s=4.0,
    ),
    "heavy": Profile(
        name="heavy",
        clients=6,
        same_tile_moves=30,
        tile_change_moves=20,
        interval_s=0.01,
        timeout_s=5.0,
    ),
}


class ResultTracker:
    def __init__(self) -> None:
        self.total = 0
        self.fail = 0

    def check(self, desc: str, ok: bool, detail: str) -> None:
        self.total += 1
        mark = "✅" if ok else "❌"
        print(f"  {mark} {desc} — {detail}", flush=True)
        if not ok:
            self.fail += 1

    def finalize(self) -> int:
        passed = self.total - self.fail
        print("")
        print(f"=== Socket.IO Load Results: {passed}/{self.total} passed, {self.fail} failed ===", flush=True)
        if self.fail:
            print("❌ Socket.IO load test FAILED", file=sys.stderr, flush=True)
            return 1
        print("✅ Socket.IO load test passed", flush=True)
        return 0


def random_username() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"lt{suffix}"


def random_char_name(index: int) -> str:
    suffix = "".join(random.choices(string.digits, k=4))
    return f"L{index}{suffix}"


def post_json(session: requests.Session, base_url: str, path: str, payload: dict, expected: int) -> dict:
    response = session.post(f"{base_url}{path}", json=payload, timeout=10)
    if response.status_code != expected:
        raise RuntimeError(f"{path} returned HTTP {response.status_code}, expected {expected}")
    return response.json()


def get_json(session: requests.Session, base_url: str, path: str, expected: int = 200) -> dict | list:
    response = session.get(f"{base_url}{path}", timeout=10)
    if response.status_code != expected:
        raise RuntimeError(f"{path} returned HTTP {response.status_code}, expected {expected}")
    return response.json()


class LoadClient:
    def __init__(self, index: int, base_url: str, profile: Profile) -> None:
        self.index = index
        self.base_url = base_url.rstrip("/")
        self.profile = profile
        self.http = requests.Session()
        self.socket = socketio.Client(
            reconnection=False,
            logger=False,
            engineio_logger=False,
            http_session=self.http,
        )
        self.player_move_events = 0
        self.connected = threading.Event()

        @self.socket.event
        def connect() -> None:
            self.connected.set()

        @self.socket.on("player_move")
        def on_player_move(_data: dict) -> None:
            self.player_move_events += 1

    def setup(self) -> tuple[int, int]:
        username = random_username()
        register_data = post_json(
            self.http,
            self.base_url,
            "/auth/register",
            {
                "username": username,
                "password": PASSWORD,
                "password_confirm": PASSWORD,
            },
            201,
        )
        user_id = register_data["user"]["id"]
        char_data = post_json(
            self.http,
            self.base_url,
            "/api/characters",
            {
                "user_id": user_id,
                "name": random_char_name(self.index),
                "job": "warrior",
            },
            201,
        )
        char_id = char_data["character"]["id"]
        return user_id, char_id

    def connect_and_join(self, char_id: int) -> None:
        self.socket.connect(self.base_url, transports=["polling"], wait_timeout=self.profile.timeout_s)
        if not self.connected.wait(timeout=self.profile.timeout_s):
            raise RuntimeError("Socket connect timeout")
        self.socket.call(
            "join_map",
            {"character_id": char_id, "map_key": MAP_KEY},
            timeout=self.profile.timeout_s,
        )

    def run_moves(self, char_id: int) -> int:
        total_calls = 0

        same_tile_positions = [(16, 16), (32, 32), (48, 48), (64, 64), (96, 96)]
        for step in range(self.profile.same_tile_moves):
            x, y = same_tile_positions[step % len(same_tile_positions)]
            self.socket.emit(
                "move",
                {"character_id": char_id, "map_key": MAP_KEY, "x": x, "y": y},
            )
            total_calls += 1
            time.sleep(self.profile.interval_s)

        boundary_positions = [(32, 32), (160, 160)]
        for step in range(self.profile.tile_change_moves):
            x, y = boundary_positions[step % len(boundary_positions)]
            self.socket.emit(
                "move",
                {"character_id": char_id, "map_key": MAP_KEY, "x": x, "y": y},
            )
            total_calls += 1
            time.sleep(self.profile.interval_s)

        return total_calls

    def disconnect(self) -> None:
        if self.socket.connected:
            self.socket.disconnect()
        self.http.close()


def run_client(index: int, base_url: str, profile: Profile) -> dict:
    client = LoadClient(index=index, base_url=base_url, profile=profile)
    user_id = char_id = None
    try:
        user_id, char_id = client.setup()
        client.connect_and_join(char_id)
        total_calls = client.run_moves(char_id)
        time.sleep(profile.interval_s * 6)
        final_state = get_json(client.http, base_url, f"/api/characters/{char_id}")
        return {
            "ok": True,
            "detail": (
                f"char_id={char_id}, calls={total_calls}, "
                f"events={client.player_move_events}, final_map={final_state['map_key']}"
            ),
            "calls": total_calls,
            "events": client.player_move_events,
        }
    finally:
        client.disconnect()


def run_profile(base_url: str, profile: Profile, tracker: ResultTracker) -> int:
    print(f"=== Socket.IO Load Test ({profile.name}) ===", flush=True)

    started = time.time()
    futures = []
    results = []

    with ThreadPoolExecutor(max_workers=profile.clients) as executor:
        for idx in range(profile.clients):
            futures.append(executor.submit(run_client, idx, base_url, profile))

        for idx, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
                results.append(result)
                tracker.check(
                    f"client worker {idx}",
                    True,
                    result["detail"],
                )
            except Exception as exc:
                tracker.check(
                    f"client worker {idx}",
                    False,
                    str(exc),
                )

    total_calls = sum(r["calls"] for r in results if r.get("ok"))
    tracker.check(
        "move acknowledgements completed",
        len(results) == profile.clients,
        f"{len(results)}/{profile.clients} workers completed",
    )

    health = requests.get(f"{base_url}/api/maps", timeout=10)
    tracker.check(
        "server health after load",
        health.status_code == 200,
        f"HTTP {health.status_code}",
    )

    elapsed = time.time() - started
    tracker.check(
        "load profile finished in expected time",
        elapsed < max(20.0, profile.timeout_s * profile.clients * 4),
        f"elapsed={elapsed:.2f}s total_calls={total_calls}",
    )
    return tracker.finalize()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--profile",
        choices=sorted(PROFILES),
        default="light",
        help="Load profile to run",
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:5000",
        help="Backend base URL",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    profile = PROFILES[args.profile]
    tracker = ResultTracker()
    try:
        return run_profile(args.base_url, profile, tracker)
    except Exception as exc:
        tracker.check("load script startup", False, str(exc))
        return tracker.finalize()


if __name__ == "__main__":
    raise SystemExit(main())
