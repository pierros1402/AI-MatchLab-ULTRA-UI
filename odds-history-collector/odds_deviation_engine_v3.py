import os
import json
from datetime import datetime

CANON_BASE = os.path.join("odds", "canonical")
OUT_DIR = os.path.join("odds", "deviations")
OUT_FILE = os.path.join(OUT_DIR, "events.json")

THRESHOLD = 0.20
ASIAN_BOOKS = {"pinnacle", "sbobet", "bet188"}

def ensure(p):
    os.makedirs(p, exist_ok=True)

def main():
    ensure(OUT_DIR)
    events = []

    for league_dir in os.listdir(CANON_BASE):
        league_path = os.path.join(CANON_BASE, league_dir)
        if not os.path.isdir(league_path):
            continue

        league = league_dir.split("=", 1)[1]

        for fix_dir in os.listdir(league_path):
            canon_file = os.path.join(
                league_path, fix_dir, "canonical.json"
            )
            if not os.path.exists(canon_file):
                continue

            with open(canon_file, "r", encoding="utf-8") as f:
                canon = json.load(f)

            fixture_id = canon["fixture_id"]

            for market, books in canon.get("markets", {}).items():
                for book, sels in books.items():
                    if book not in ASIAN_BOOKS:
                        continue

                    for sel, prices in sels.items():
                        o = prices.get("opening")
                        c = prices.get("current")
                        ts = prices.get("ts")

                        if o is None or c is None:
                            continue

                        delta = round(c - o, 3)
                        abs_delta = abs(delta)

                        if abs_delta < THRESHOLD:
                            continue

                        events.append({
                            "ts": ts or datetime.utcnow().isoformat(),
                            "league": league,
                            "fixture_id": fixture_id,
                            "market": market,
                            "selection": sel,
                            "provider": book,
                            "opening": o,
                            "current": c,
                            "delta": delta,
                            "abs_delta": abs_delta,
                        })

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "schema": "odds_events_v1",
                "items": events
            },
            f,
            indent=2,
            ensure_ascii=False
        )

    print(f"Events written: {len(events)}")

if __name__ == "__main__":
    main()
