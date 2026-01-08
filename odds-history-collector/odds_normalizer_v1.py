import json
import os
from datetime import datetime, timezone
from typing import Dict, List

# =====================================================
# PATHS
# =====================================================
ODDS_V2_BASE = os.path.join("odds", "v2")
ODDS_CANON_BASE = os.path.join("odds", "canonical")

# =====================================================
# HELPERS
# =====================================================
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def parse_ts_from_filename(fname: str) -> datetime:
    # snapshot_YYYY-MM-DDTHH-MM-SSZ.json
    ts = fname.replace("snapshot_", "").replace(".json", "")
    return datetime.strptime(ts, "%Y-%m-%dT%H-%M-%SZ").replace(tzinfo=timezone.utc)

def norm_selection(sel: str) -> str:
    return sel.upper().strip()

# =====================================================
# NORMALIZATION LOGIC
# =====================================================
def normalize_fixture_snapshots(league: str, fixture: str, files: List[str]):
    snapshots = []

    for fname in files:
        fpath = os.path.join(
            ODDS_V2_BASE, f"league={league}", f"fixture={fixture}", fname
        )
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # only provider snapshots
        if data.get("provider") != "the_odds_api":
            continue

        markets = data.get("markets", {})
        if not markets:
            continue

        snapshots.append({
            "ts": parse_ts_from_filename(fname),
            "markets": markets
        })

    if not snapshots:
        return

    snapshots.sort(key=lambda x: x["ts"])
    opening = snapshots[0]
    current = snapshots[-1]

    canonical = {
        "schema_version": "odds_canonical_v1",
        "league": league,
        "fixture_id": fixture,
        "opening_ts": opening["ts"].isoformat(),
        "current_ts": current["ts"].isoformat(),
        "markets": {}
    }

    # Build current prices
    for market_key in current["markets"]:
        canonical["markets"][market_key] = {}

        for bm_entry in current["markets"][market_key]:
            bm = bm_entry["bookmaker"]
            canonical["markets"][market_key].setdefault(bm, {})

            for o in bm_entry["outcomes"]:
                name = norm_selection(o.get("name", ""))
                point = o.get("point")

                sel = f"{name}_{point}" if point is not None else name

                canonical["markets"][market_key][bm][sel] = {
                    "opening": None,
                    "current": o.get("price")
                }

    # Fill opening prices
    for market_key in opening["markets"]:
        if market_key not in canonical["markets"]:
            continue

        for bm_entry in opening["markets"][market_key]:
            bm = bm_entry["bookmaker"]
            if bm not in canonical["markets"][market_key]:
                continue

            for o in bm_entry["outcomes"]:
                name = norm_selection(o.get("name", ""))
                point = o.get("point")

                sel = f"{name}_{point}" if point is not None else name

                if sel in canonical["markets"][market_key][bm]:
                    canonical["markets"][market_key][bm][sel]["opening"] = o.get("price")

    # Write canonical
    out_dir = os.path.join(
        ODDS_CANON_BASE, f"league={league}", f"fixture={fixture}"
    )
    ensure_dir(out_dir)

    with open(os.path.join(out_dir, "canonical.json"), "w", encoding="utf-8") as f:
        json.dump(canonical, f, indent=2, ensure_ascii=False)

# =====================================================
# MAIN
# =====================================================
def main():
    total = 0

    if not os.path.exists(ODDS_V2_BASE):
        print("No odds/v2 directory found.")
        return

    for league_dir in os.listdir(ODDS_V2_BASE):
        if not league_dir.startswith("league="):
            continue

        league = league_dir.split("=", 1)[1]
        league_path = os.path.join(ODDS_V2_BASE, league_dir)

        for fixture_dir in os.listdir(league_path):
            if not fixture_dir.startswith("fixture="):
                continue

            fixture = fixture_dir.split("=", 1)[1]
            fpath = os.path.join(league_path, fixture_dir)

            files = [
                f for f in os.listdir(fpath)
                if f.startswith("snapshot_") and f.endswith(".json")
            ]

            if len(files) < 2:
                continue

            normalize_fixture_snapshots(league, fixture, files)
            total += 1

    print(f"Canonical odds written for {total} fixtures.")

if __name__ == "__main__":
    main()
