import json, pathlib
from functools import lru_cache

ROOT = pathlib.Path(__file__).resolve().parent.parent   # app.py 기준 프로젝트 루트

@lru_cache                             # 서버 기동-1회만 파싱
def get_walkable(map_key: str) -> set[tuple[int,int]]:
    """Tiled JSON → (x, y) 타일 좌표 중 통과 가능한 것만 set 로 돌려준다."""
    path = ROOT / f"{map_key}.json"
    data = json.loads(path.read_text(encoding="utf-8"))

    # 1) 충돌 타일 gid 수집
    collidable = set()
    for ts in data["tilesets"]:
        firstgid = ts["firstgid"]
        for tile in ts.get("tiles", []):
            props = {p["name"]: p["value"] for p in tile.get("properties", [])}
            if props.get("collides"):
                collidable.add(firstgid + tile["id"])

    # 2) 첫 번째 타일 레이어만 사용 (Tile Layer 1)
    layer = next(l for l in data["layers"] if l["type"] == "tilelayer")
    w = layer["width"]
    walkable = set()
    for idx, gid in enumerate(layer["data"]):
        x, y = idx % w, idx // w
        if gid == 0 or gid not in collidable:      # gid 0=빈칸, 또는 collides False
            walkable.add((x, y))
    return walkable
