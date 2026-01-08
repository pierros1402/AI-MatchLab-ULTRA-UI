import json
import os
import re
import time
import requests
from datetime import datetime, timezone

# =========================
# CONFIG
# =========================
FIXTURES_BASE = os.path.join("fixtures", "v1")
OUT_PATH = os.path.join("mappings", "bet365_map.json")

LEAGUES_ALLOWED = {"ENG1", "ESP1", "FRA1", "GRE1"}
KICKOFF_TOLERANCE_SEC = 5 * 60  # 5 minutes
CONFIDENCE_THRESHOLD = 0.95

BET365_HEADERS = {
    # TODO: συμπλήρωσε once
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://www.bet365.com",
    "Referer": "https://www.bet365.com/",
}

# Example JSON feed endpoints (illustrative; συμπλήρωσε τα πραγματικά που χρησιμοποιείς)
BET365_EVENTS_ENDPOINTS = {
    "ENG1": "https://example.bet365.internal/events/football/england/premier-league",
    "ESP1": "https://example.bet365.internal/events/football/spain/la-liga",
    "FRA1": "https://example.bet365.internal/events/football/france/ligue-1",
    "GRE1": "https://example.bet365.internal/events/football/greece/super-league",
}

# =========================
# HELPERS
# =========================
def norm(s: str) -> str:
    if not s: return ""
    s = s.lower()
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def load_fixtures():
    fixtures = []
    for league_dir in os.listdir(FIXTURES_BASE):
        if not league_dir.startswith("league="): continue
        league = league_dir.split("=",1)[1]
        if league not in LEAGUES_ALLOWED: continue
        lp = os.path.join(FIXTURES_BASE, league_dir)
        for fn in os.listdir(lp):
            if not (fn.startswith("date=") and fn.endswith(".json")): continue
            with open(os.path.join(lp, fn), "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list): continue
            for fx in data:
                if "fixture_id" in fx and isinstance(fx.get("kickoff_ts"), (int,float)):
                    fx2 = dict(fx)
                    fx2["league"] = league
                    fixtures.append(fx2)
    return fixtures

def fetch_bet365_events(league):
    url = BET365_EVENTS_ENDPOINTS.get(league)
    if not url: return []
    r = requests.get(url, headers=BET365_HEADERS, timeout=15)
    r.raise_for_status()
    return r.json().get("events", [])

def score_match(fx, ev):
    score = 0.0
    # kickoff
    if abs(ev["kickoff_ts"] - fx["kickoff_ts"]) <= KICKOFF_TOLERANCE_SEC:
        score += 0.5
    # teams
    if norm(ev["home"]) == norm(fx["home"]):
        score += 0.25
    if norm(ev["away"]) == norm(fx["away"]):
        score += 0.25
    return score

# =========================
# MAIN
# =========================
def main():
    fixtures = load_fixtures()
    items = []

    for league in LEAGUES_ALLOWED:
        b365_events = fetch_bet365_events(league)
        time.sleep(0.5)

        for fx in [f for f in fixtures if f["league"] == league]:
            best = None
            best_score = 0.0
            for ev in b365_events:
                s = score_match(fx, ev)
                if s > best_score:
                    best_score, best = s, ev

            if best and best_score >= CONFIDENCE_THRESHOLD:
                items.append({
                    "fixture_id": fx["fixture_id"],
                    "bet365_event_id": best["event_id"],
                    "league": league,
                    "kickoff_ts": fx["kickoff_ts"],
                    "home": fx["home"],
                    "away": fx["away"],
                    "confidence": round(best_score, 2)
                })

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "schema_version": "bet365_mapping_v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "items": items
        }, f, indent=2, ensure_ascii=False)

    print(f"Bet365 discovery completed. Mapped: {len(items)}")

if __name__ == "__main__":
    main()
