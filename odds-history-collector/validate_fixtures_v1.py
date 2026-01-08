import json
import os
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.join("fixtures", "v1")
LEAGUES_ALLOWED = {"ENG1", "ESP1", "FRA1", "GRE1"}

NOW = datetime.now(timezone.utc)
PAST_LIMIT = NOW - timedelta(hours=24)
FUTURE_LIMIT = NOW + timedelta(days=7)

report = {
    "ok": True,
    "generated_at": NOW.isoformat(),
    "totals": {
        "files": 0,
        "fixtures": 0,
        "flagged": 0,
        "critical": 0
    },
    "issues": [],
    "duplicates": [],
    "by_league": {},
    "by_date": {},
}

seen_ids = {}
seen_keys = {}

def flag(level, msg, fixture=None, context=None):
    report["issues"].append({
        "level": level,
        "message": msg,
        "fixture": fixture,
        "context": context
    })
    report["totals"]["flagged"] += 1
    if level == "CRITICAL":
        report["totals"]["critical"] += 1
        report["ok"] = False

def parse_dt(val):
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None

for league_dir in os.listdir(BASE_DIR):
    if not league_dir.startswith("league="):
        continue

    league = league_dir.split("=", 1)[1]
    if league not in LEAGUES_ALLOWED:
        flag("ERROR", f"Unexpected league folder {league}", context=league_dir)
        continue

    league_path = os.path.join(BASE_DIR, league_dir)
    report["by_league"].setdefault(league, 0)

    for fname in os.listdir(league_path):
        if not fname.startswith("date=") or not fname.endswith(".json"):
            continue

        report["totals"]["files"] += 1
        date_key = fname.replace("date=", "").replace(".json", "")
        report["by_date"].setdefault(date_key, 0)

        path = os.path.join(league_path, fname)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            flag("CRITICAL", "File does not contain a list", context=path)
            continue

        for fx in data:
            report["totals"]["fixtures"] += 1
            report["by_league"][league] += 1
            report["by_date"][date_key] += 1

            fid = fx.get("fixture_id")
            home = fx.get("home")
            away = fx.get("away")
            kickoff_raw = fx.get("kickoff_utc")

            if not fid:
                flag("CRITICAL", "Missing fixture_id", fx, path)
                continue

            if not home or not away:
                flag("ERROR", "Missing home/away", fx, path)

            kickoff = parse_dt(kickoff_raw)
            if not kickoff:
                flag("ERROR", "Invalid kickoff_utc", fx, path)
            else:
                if kickoff < PAST_LIMIT or kickoff > FUTURE_LIMIT:
                    flag("ERROR", "Kickoff outside allowed window", fx, path)

            if fid in seen_ids:
                flag("CRITICAL", f"Duplicate fixture_id {fid}", fx, path)
                report["duplicates"].append(fid)
            else:
                seen_ids[fid] = fx

            key = (league, home, away, kickoff_raw)
            if key in seen_keys and seen_keys[key] != fid:
                flag("CRITICAL", "Duplicate logical fixture (same teams/time)", fx, path)
            else:
                seen_keys[key] = fid

with open("fixtures_validation_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("Fixture validation completed.")
print("OK:", report["ok"])
print("Totals:", report["totals"])
