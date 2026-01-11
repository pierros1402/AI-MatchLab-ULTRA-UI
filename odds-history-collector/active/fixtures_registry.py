import os
import json
import requests
from datetime import datetime, timedelta, timezone

# -----------------------------
# CONFIG
# -----------------------------
ROOT_DIR = "./fixtures/v1"
SCHEMA_VERSION = "fixture_registry_v1"
SOURCE = "espn"

# ESPN league codes
LEAGUES = {
    "ENG1": {
        "name": "Premier League",
        "espn_code": "eng.1"
    },
    "ESP1": {
        "name": "La Liga",
        "espn_code": "esp.1"
    },
    "FRA1": {
        "name": "Ligue 1",
        "espn_code": "fra.1"
    },
    "GRE1": {
        "name": "Super League 1",
        "espn_code": "gre.1"
    }
}

# Time window
DAYS_BACK = 1
DAYS_FORWARD = 7

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard"

# -----------------------------
# HELPERS
# -----------------------------
def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def date_range(start, end):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)

def parse_status(ev):
    st = ev.get("status", {}).get("type", {}).get("state", "")
    if st == "pre":
        return "SCHEDULED"
    if st == "in":
        return "LIVE"
    if st == "post":
        return "FINISHED"
    return "SCHEDULED"

def safe_team(ev, side):
    try:
        comps = ev["competitions"][0]["competitors"]
        for c in comps:
            if c.get("homeAway") == side:
                return c.get("team", {}).get("displayName", "")
    except Exception:
        pass
    return ""

def fetch_day(league_code, day):
    url = ESPN_SCOREBOARD.format(league=league_code)
    params = {"dates": day.strftime("%Y%m%d")}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

# -----------------------------
# MAIN
# -----------------------------
def main():
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=DAYS_BACK)
    end = today + timedelta(days=DAYS_FORWARD)

    for league_id, meta in LEAGUES.items():
        out_dir = os.path.join(ROOT_DIR, f"league={league_id}")
        ensure_dir(out_dir)

        for day in date_range(start, end):
            payload = fetch_day(meta["espn_code"], day)
            events = payload.get("events", [])

            records = []
            for ev in events:
                try:
                    kickoff_ts = int(
                        datetime.fromisoformat(
                            ev["date"].replace("Z", "+00:00")
                        ).timestamp()
                    )
                except Exception:
                    continue

                rec = {
                    "schema_version": SCHEMA_VERSION,
                    "fixture_id": str(ev.get("id")),
                    "league_id": league_id,
                    "league_name": meta["name"],
                    "home": safe_team(ev, "home"),
                    "away": safe_team(ev, "away"),
                    "kickoff_ts": kickoff_ts,
                    "date": day.isoformat(),
                    "status": parse_status(ev),
                    "source": SOURCE
                }
                records.append(rec)

            out_file = os.path.join(out_dir, f"date={day.isoformat()}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
