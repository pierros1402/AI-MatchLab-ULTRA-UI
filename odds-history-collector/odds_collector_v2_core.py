import json
import os
import time
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List

# =====================================================
# CONFIG
# =====================================================
DEBUG_WIDE_WINDOW = False

FIXTURES_BASE = os.path.join("fixtures", "v1")
ODDS_BASE = os.path.join("odds", "v2")

LEAGUES_ALLOWED = {"ENG1", "ESP1", "FRA1", "GRE1"}

NOW = datetime.now(timezone.utc)

if DEBUG_WIDE_WINDOW:
    WINDOW_PAST = NOW - timedelta(days=3)
    WINDOW_FUTURE = NOW + timedelta(days=7)
else:
    WINDOW_PAST = NOW - timedelta(hours=12)
    WINDOW_FUTURE = NOW + timedelta(hours=36)

# =====================================================
# ODDS API CONFIG
# =====================================================
ODDS_API_KEY = os.getenv("ODDS_API_KEY")
if not ODDS_API_KEY:
    raise RuntimeError("Missing ODDS_API_KEY environment variable")

ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports"
REGIONS = "eu"
MARKETS = "h2h,totals"
BOOKMAKERS = "betfair,unibet"
ODDS_FORMAT = "decimal"
DATE_FORMAT = "iso"

SPORT_KEYS = {
    "ENG1": "soccer_epl",
    "ESP1": "soccer_spain_la_liga",
    "FRA1": "soccer_france_ligue_one",
    "GRE1": "soccer_greece_super_league",
}

CACHE_TTL_SEC = 50 * 60
_LEAGUE_CACHE: Dict[str, List[Dict]] = {}
_LEAGUE_CACHE_AT: Dict[str, float] = {}

# =====================================================
# HELPERS
# =====================================================
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def ts_for_filename(dt: datetime):
    return dt.strftime("%Y-%m-%dT%H-%M-%SZ")

def norm(s: str) -> str:
    return "".join(c for c in s.lower() if c.isalnum() or c.isspace()).strip()

# =====================================================
# FIXTURE LOADER
# =====================================================
def load_fixtures() -> Dict[str, Dict]:
    fixtures: Dict[str, Dict] = {}

    for league_dir in os.listdir(FIXTURES_BASE):
        if not league_dir.startswith("league="):
            continue

        league = league_dir.split("=", 1)[1]
        if league not in LEAGUES_ALLOWED:
            continue

        league_path = os.path.join(FIXTURES_BASE, league_dir)

        for fname in os.listdir(league_path):
            if not (fname.startswith("date=") and fname.endswith(".json")):
                continue

            with open(os.path.join(league_path, fname), "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, list):
                continue

            for fx in data:
                fid = fx.get("fixture_id")
                ts = fx.get("kickoff_ts")

                if not fid or not isinstance(ts, (int, float)):
                    continue

                kickoff = datetime.fromtimestamp(ts, tz=timezone.utc)
                if kickoff < WINDOW_PAST or kickoff > WINDOW_FUTURE:
                    continue

                if fid not in fixtures:
                    fx_copy = dict(fx)
                    fx_copy["league"] = league
                    fx_copy["_kickoff_dt"] = kickoff
                    fixtures[fid] = fx_copy

    return fixtures

# =====================================================
# ODDS API FETCH (CACHED)
# =====================================================
def get_league_events(league: str) -> List[Dict]:
    now = time.time()
    if league in _LEAGUE_CACHE and (now - _LEAGUE_CACHE_AT.get(league, 0)) < CACHE_TTL_SEC:
        return _LEAGUE_CACHE[league]

    sport_key = SPORT_KEYS.get(league)
    if not sport_key:
        return []

    url = f"{ODDS_API_BASE}/{sport_key}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": REGIONS,
        "markets": MARKETS,
        "bookmakers": BOOKMAKERS,
        "oddsFormat": ODDS_FORMAT,
        "dateFormat": DATE_FORMAT,
    }

    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()

    _LEAGUE_CACHE[league] = data
    _LEAGUE_CACHE_AT[league] = now
    return data

# =====================================================
# MATCH SCORING
# =====================================================
def score_event(fx: Dict, ev: Dict) -> float:
    score = 0.0
    ct = ev.get("commence_time")
    if not ct:
        return 0.0

    try:
        ev_kick = datetime.fromisoformat(ct.replace("Z", "+00:00"))
        if abs((ev_kick - fx["_kickoff_dt"]).total_seconds()) <= 300:
            score += 0.5
    except Exception:
        return 0.0

    if norm(ev.get("home_team", "")) == norm(fx.get("home", "")):
        score += 0.25
    if norm(ev.get("away_team", "")) == norm(fx.get("away", "")):
        score += 0.25

    return score

# =====================================================
# PROVIDER ADAPTER
# =====================================================
def fetch_odds_provider(fixture: Dict) -> Dict:
    league = fixture.get("league")
    if league not in SPORT_KEYS:
        return {}

    events = get_league_events(league)
    if not events:
        return {}

    best, best_score = None, 0.0
    for ev in events:
        s = score_event(fixture, ev)
        if s > best_score:
            best, best_score = ev, s

    if not best or best_score < 0.95:
        return {}

    markets: Dict[str, List[Dict]] = {}

    for bm in best.get("bookmakers", []):
        bm_key = bm.get("key")
        if bm_key not in BOOKMAKERS.split(","):
            continue

        for mk in bm.get("markets", []):
            if mk.get("key") == "h2h":
                markets.setdefault("h2h", []).append({
                    "bookmaker": bm_key,
                    "outcomes": mk.get("outcomes", [])
                })

            elif mk.get("key") == "totals":
                kept = [o for o in mk.get("outcomes", []) if o.get("point") in (1.5, 2.5, 3.5)]
                if kept:
                    markets.setdefault("totals", []).append({
                        "bookmaker": bm_key,
                        "outcomes": kept
                    })

    if not markets:
        return {}

    return {
        "schema_version": "odds_snapshot_provider_v1",
        "provider": "the_odds_api",
        "fixture_id": fixture["fixture_id"],
        "league": league,
        "collected_at": NOW.isoformat(),
        "markets": markets,
    }

# =====================================================
# SNAPSHOT WRITER
# =====================================================
def write_snapshot(fixture: Dict, odds_payload: Dict):
    league = fixture["league"]
    fid = fixture["fixture_id"]

    base_dir = os.path.join(ODDS_BASE, f"league={league}", f"fixture={fid}")
    ensure_dir(base_dir)

    meta_path = os.path.join(base_dir, "meta.json")
    if not os.path.exists(meta_path):
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "fixture_id": fid,
                "league": league,
                "home": fixture.get("home"),
                "away": fixture.get("away"),
                "kickoff_ts": fixture.get("kickoff_ts"),
                "kickoff_utc": fixture["_kickoff_dt"].isoformat(),
                "created_at": NOW.isoformat(),
            }, f, indent=2, ensure_ascii=False)

    snap_name = f"snapshot_{ts_for_filename(NOW)}.json"
    with open(os.path.join(base_dir, snap_name), "w", encoding="utf-8") as f:
        json.dump(odds_payload, f, indent=2, ensure_ascii=False)

# =====================================================
# MAIN
# =====================================================
def main():
    fixtures = load_fixtures()
    print(f"Eligible fixtures for odds window: {len(fixtures)}")

    written = 0
    for fixture in fixtures.values():
        odds = fetch_odds_provider(fixture)
        if odds:
            write_snapshot(fixture, odds)
            written += 1

    print(f"Odds Collector v2.1 finished. Snapshots written: {written}")

if __name__ == "__main__":
    main()
