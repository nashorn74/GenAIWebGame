import json, pathlib
import types
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


# ─────────────────────────────────────────────────────────
#  Tiled JSON 전체를 읽어서 layer.data[y][x] 식으로 접근
# ─────────────────────────────────────────────────────────
class _SimpleLayer:
    """Phaser-style layer 최소 구현 (id, data, get_tile_at)"""
    def __init__(self, width:int, height:int, flat:list[int]):
        self.width  = width
        self.height = height
        # 2 차원 list [y][x]  (gid 값, 0 == empty)
        self.data: list[list[int]] = [
            flat[y*width:(y+1)*width] for y in range(height)
        ]

    def get_tile_at(self, x:int, y:int):
        if 0 <= x < self.width and 0 <= y < self.height:
            gid = self.data[y][x]
            return _SimpleTile(gid) if gid else None
        return None


class _SimpleTile:
    """Phaser Tile 객체와 호환되는 최소 속성(index)만 제공"""
    def __init__(self, gid:int):
        self.index = gid


@lru_cache
def get_tilemap(map_key:str):
    """Tiled JSON → (전체 json, 2차원 타일배열) 반환"""
    path  = ROOT / f"{map_key}.json"
    data  = json.loads(path.read_text(encoding="utf-8"))

    layer = next(l for l in data["layers"] if l["type"]=="tilelayer")
    w, h  = layer["width"], layer["height"]
    grid  = [layer["data"][i*w:(i+1)*w] for i in range(h)]  # 2-D 리스트

    # grid 를 .data 로 접근할 수 있게 네임스페이스 래핑
    layer_ns = types.SimpleNamespace(width=w, height=h, data=grid)
    return data, layer_ns