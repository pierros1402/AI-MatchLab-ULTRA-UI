import json
import os
from typing import Dict, List

# =====================================================
# PATHS
# =====================================================
ODDS_CANON_BASE = os.path.join("odds", "canonical")
ODDS_DEV_BASE = os.path.join("odds", "deviations")
RADAR_FILE = os.path.join(ODDS_DEV_BASE, "radar.json")

# =====================================================
# THRESHOLDS
# =====================================================
THRESHOLDS = {
    "h2h": 0.20,
    "totals": 0.10,
}

# =====================================================
# HELPERS
# =====================================================
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

# =====================================================
# DEVIATION LOGIC
# =====================================================
def compute_deviations(canonical: Dict) -> Dict:
    fixture_id = canonical["fixture_id"]
    league = canonical["league"]

    best = None

    for market, books in canonical.get("markets", {}).items():
        if market not in THRESHOLDS:
            continue

        threshold = THRESHOLDS[market]

        for bookmaker, selections in books.items():
            for sel, prices in selections.items():
                opening = prices.get("opening")
                current = prices.get("current")

                if opening is None or current is None:
                    continue

                delta = current - opening
                abs_delta = abs(delta)

                if abs_delta < threshold:
                    continue

                rec = {
                    "fixture_id": fixture_id,
                    "league": league,
                    "market": market,
                    "selection": sel,
                    "bookmaker": bookmaker,
                    "opening": opening,
                    "current": current,
                    "delta": round(delta, 3),
                    "abs_delta": round(abs_delta, 3),
                }

                if not best or abs_delta > best["abs_delta"]:
                    best = rec

    return best

# =====================================================
# MAIN
# =====================================================
def main():
    ensure_dir(ODDS_DEV_BASE)
    radar: List[Dict] = []

    if not os.path.exists(ODDS_CANON_BASE):
        print("No canonical odds found.")
        return

    for league_dir in os.listdir(ODDS_CANON_BASE):
        if not league_dir.startswith("league="):
            continue

        league = league_dir.split("=", 1)[1]
        league_path = os.path.join(ODDS_CANON_BASE, league_dir)

        for fixture_dir in os.listdir(league_path):
            if not fixture_dir.startswith("fixture="):
                continue

            fixture = fixture_dir.split("=", 1)[1]
            canon_path = os.path.join(
                league_path, fixture_dir, "canonical.json"
            )

            if not os.path.exists(canon_path):
                continue

            with open(canon_path, "r", encoding="utf-8") as f:
                canonical = json.load(f)

            best = compute_deviations(canonical)
            if best:
                radar.append(best)

    # Sort radar by absolute delta desc
    radar.sort(key=lambda x: x["abs_delta"], reverse=True)

    with open(RADAR_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "schema_version": "odds_radar_v1",
            "items": radar
        }, f, indent=2, ensure_ascii=False)

    print(f"Radar deviations written: {len(radar)}")

if __name__ == "__main__":
    main()
