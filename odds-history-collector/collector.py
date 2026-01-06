import os
import json
import time
import yaml
import math
import hashlib
import requests
from datetime import datetime, timezone
from dateutil import parser as dtparser

def load_cfg():
    with open("config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def utc_now_ts():
    return int(datetime.now(timezone.utc).timestamp())

def minutes_to_kickoff(kickoff_ts, now_ts):
    return max(0, int((kickoff_ts - now_ts) // 60))

def approx_match(mins, target, tol):
    return abs(mins - target) <= tol

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def jsonl_append(path, obj):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def key_hash(*parts):
    h = hashlib.sha256()
    for p in parts:
        h.update(str(p).encode("utf-8"))
        h.update(b"|")
    return h.hexdigest()

def seen_keys(path):
    keys = set()
    if not os.path.exists(path):
        return keys
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                o = json.loads(line)
                k = key_hash(
                    o["event_id"],
                    o["bookmaker"],
                    o["market"],
                    o["selection"],
                    o["snapshot_offset_min"]
                )
                keys.add(k)
            except Exception:
                continue
    return keys

def fetch_odds(cfg, league_provider_id):
    url = f'{cfg["api"]["base_url"]}/sports/{league_provider_id}/odds'
    params = {
        "apiKey": cfg["api"]["odds_api_key"],
        "regions": ",".join(cfg["api"]["regions"]),
        "markets": ",".join(cfg["api"]["markets"]),
        "oddsFormat": cfg["api"]["odds_format"],
        "dateFormat": "iso"
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def normalize_markets(market_key):
    # provider -> canonical
    if market_key == "h2h":
        return "1X2"
    if market_key == "totals":
        return "OU25"
    if market_key == "btts":
        return "BTTS"
    if market_key == "double_chance":
        return "DC"
    return None

def normalize_selection(market, outcome):
    name = outcome.get("name")
    if market == "1X2":
        return {"Home":"1","Draw":"X","Away":"2"}.get(name, name)
    if market == "OU25":
        return {"Over":"O","Under":"U"}.get(name, name)
    if market == "BTTS":
        return {"Yes":"Yes","No":"No"}.get(name, name)
    if market == "DC":
        return {"Home/Draw":"1X","Home/Away":"12","Draw/Away":"X2"}.get(name, name)
    return name

def main():
    cfg = load_cfg()
    now_ts = utc_now_ts()
    tol = cfg["collector"]["tolerance_minutes"]
    offsets = set(cfg["collector"]["snapshot_offsets_min"])

    for league_id, provider_id in cfg["leagues"].items():
        events = fetch_odds(cfg, provider_id)
        for ev in events:
            kickoff = dtparser.isoparse(ev["commence_time"]).replace(tzinfo=timezone.utc)
            kickoff_ts = int(kickoff.timestamp())
            mins = minutes_to_kickoff(kickoff_ts, now_ts)

            target_offset = None
            for off in offsets:
                if approx_match(mins, off, tol):
                    target_offset = off
                    break
            if target_offset is None:
                continue

            date_str = kickoff.date().isoformat()
            event_id = str(ev["id"])
            out_dir = os.path.join(
                cfg["storage"]["root_dir"],
                f"date={date_str}",
                f"league={league_id}"
            )
            ensure_dir(out_dir)
            out_file = os.path.join(out_dir, f"event={event_id}.jsonl")
            existing = seen_keys(out_file)

            for bm in ev.get("bookmakers", []):
                bookmaker = bm.get("key")
                for m in bm.get("markets", []):
                    market = normalize_markets(m.get("key"))
                    if not market:
                        continue
                    for o in m.get("outcomes", []):
                        selection = normalize_selection(market, o)
                        odds = o.get("price")
                        rec = {
                            "schema_version": cfg["schema_version"],
                            "event_id": event_id,
                            "kickoff_ts": kickoff_ts,
                            "league_id": league_id,
                            "home": ev.get("home_team"),
                            "away": ev.get("away_team"),
                            "bookmaker": bookmaker,
                            "market": market,
                            "selection": selection,
                            "odds": odds,
                            "snapshot_ts": now_ts,
                            "snapshot_offset_min": target_offset,
                            "source": cfg["source"]
                        }
                        k = key_hash(
                            rec["event_id"],
                            rec["bookmaker"],
                            rec["market"],
                            rec["selection"],
                            rec["snapshot_offset_min"]
                        )
                        if k in existing:
                            continue
                        jsonl_append(out_file, rec)
                        existing.add(k)

if __name__ == "__main__":
    main()
