import os
import json
import requests
from datetime import datetime, timezone
from collections import defaultdict

EXPORT_URL = "https://aimatchlab-main.pierros1402.workers.dev/export/results"
OUTPUT_DIR = os.path.join("data", "ft")
TIMEOUT = 30

os.makedirs(OUTPUT_DIR, exist_ok=True)


def ts_to_utc_date(ts: int) -> str:
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d")


def load_existing_dates():
    dates = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("ft_") and f.endswith(".json"):
            dates.add(f.replace("ft_", "").replace(".json", ""))
    return dates


def main():
    print("[FT-EXPORT] Fetching export/results …")
    resp = requests.get(EXPORT_URL, timeout=TIMEOUT)
    resp.raise_for_status()

    payload = resp.json()
    matches = payload.get("matches", [])

    if not matches:
        print("[FT-EXPORT] No matches returned.")
        return

    existing_dates = load_existing_dates()
    buckets = defaultdict(list)

    for m in matches:
        if m.get("status") != "FT":
            continue

        ts_ft = m.get("ts_ft")
        if not ts_ft:
            continue

        day = ts_to_utc_date(ts_ft)
        buckets[day].append(m)

    for day, items in buckets.items():
        if day in existing_dates:
            print(f"[FT-EXPORT] {day} already exists — skipping.")
            continue

        fixture_ids = set()
        valid_items = []

        for m in items:
            fid = m.get("fixture_id")
            if not fid or fid in fixture_ids:
                continue

            fixture_ids.add(fid)
            valid_items.append(m)

        out_path = os.path.join(OUTPUT_DIR, f"ft_{day}.json")

        out_payload = {
            "date": day,
            "count": len(valid_items),
            "matches": valid_items,
        }

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out_payload, f, ensure_ascii=False, indent=2)

        print(f"[FT-EXPORT] Written {out_path} ({len(valid_items)} matches)")

    print("[FT-EXPORT] Done.")


if __name__ == "__main__":
    main()
