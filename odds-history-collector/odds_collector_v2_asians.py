import os
import json
import time
import requests
from datetime import datetime, timezone

ODDS_API_KEY = os.getenv("ODDS_API_KEY")
BASE_URL = "https://api.the-odds-api.com/v4/sports"

LEAGUES = {
    "ENG1": "soccer_epl",
    "ESP1": "soccer_spain_la_liga",
    "ITA1": "soccer_italy_serie_a",
    "FRA1": "soccer_france_ligue_one",
}

BOOKMAKERS = "pinnacle,sbobet,bet188"
MARKETS = "h2h,totals"

OUT_BASE = os.path.join("odds", "v2")

def ensure(p):
    os.makedirs(p, exist_ok=True)

def fetch_league_odds(league_code):
    url = f"{BASE_URL}/{league_code}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "eu",
        "markets": MARKETS,
        "bookmakers": BOOKMAKERS,
        "oddsFormat": "decimal",
        "dateFormat": "iso",
    }
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def main():
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")

    for league, api_code in LEAGUES.items():
        print(f"[{league}] fetching odds…")
        try:
            events = fetch_league_odds(api_code)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue

        for ev in events:
            fixture_id = ev["id"]
            out_dir = os.path.join(OUT_BASE, f"league={league}", f"fixture={fixture_id}")
            ensure(out_dir)

            out_file = os.path.join(out_dir, f"snapshot_{ts}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(ev, f, indent=2, ensure_ascii=False)

        time.sleep(1)

if __name__ == "__main__":
    main()
