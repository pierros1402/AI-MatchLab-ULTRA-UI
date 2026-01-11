# =========================================================
# HISTORICAL STATS BUILDER — FOOTBALL-DATA.CO.UK
# v1.4 FINAL (LEAGUE / SEASON FOLDERS)
#
# Folder structure:
# data/football-data/
#   ├── ENG1/E0_1415.csv
#   ├── FRA1/F1_2324.csv
#   ├── BEL1/B1_1819.csv
#
# Output:
#   value/team_stats.json
# =========================================================

import csv
import os
import json
from statistics import mean

# =========================
# CONFIG (LOCKED)
# =========================

DATA_ROOT = "data/football-data"
OUTPUT_FILE = "value/team_stats.json"
LAST_N_MATCHES = 20

# =========================
# HELPERS
# =========================

def safe_mean(values):
    values = [v for v in values if isinstance(v, (int, float))]
    return mean(values) if values else 0.0


def load_csv(path):
    with open(path, newline="", encoding="utf-8", errors="ignore") as f:
        return list(csv.DictReader(f))


# =========================
# MAIN
# =========================

def run_builder():
    team_matches = {}
    total_csv = 0
    total_matches = 0

    # ---------------------------------------------
    # Traverse league folders
    # ---------------------------------------------
    for league in sorted(os.listdir(DATA_ROOT)):
        league_path = os.path.join(DATA_ROOT, league)

        if not os.path.isdir(league_path):
            continue

        print(f"[LEAGUE] {league}")

        for fname in sorted(os.listdir(league_path)):
            if not fname.lower().endswith(".csv"):
                continue

            total_csv += 1
            fpath = os.path.join(league_path, fname)
            print(f"  [LOAD] {league}/{fname}")

            rows = load_csv(fpath)

            for r in rows:
                try:
                    home = r["HomeTeam"].strip()
                    away = r["AwayTeam"].strip()
                    hg = int(r["FTHG"])
                    ag = int(r["FTAG"])
                except Exception:
                    continue

                total_matches += 1

                match = {
                    "home": home,
                    "away": away,
                    "homeGoals": hg,
                    "awayGoals": ag
                }

                team_matches.setdefault(home, []).append(match)
                team_matches.setdefault(away, []).append(match)

    # ---------------------------------------------
    # Build per-team stats
    # ---------------------------------------------
    team_stats = {}

    for team, matches in team_matches.items():
        recent = matches[-LAST_N_MATCHES:]

        goals_for = []
        goals_against = []
        btts = []
        over25 = []

        for m in recent:
            if m["home"] == team:
                gf = m["homeGoals"]
                ga = m["awayGoals"]
            else:
                gf = m["awayGoals"]
                ga = m["homeGoals"]

            goals_for.append(gf)
            goals_against.append(ga)
            btts.append(1 if gf > 0 and ga > 0 else 0)
            over25.append(1 if (gf + ga) >= 3 else 0)

        team_stats[team] = {
            "matches_used": len(recent),
            "goals_for_avg": round(safe_mean(goals_for), 3),
            "goals_against_avg": round(safe_mean(goals_against), 3),
            "btts_rate": round(safe_mean(btts), 3),
            "over25_rate": round(safe_mean(over25), 3)
        }

    # ---------------------------------------------
    # Write output
    # ---------------------------------------------
    os.makedirs("value", exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(team_stats, f, ensure_ascii=False, indent=2)

    print(
        f"\n[HIST] DONE\n"
        f"CSV files read   : {total_csv}\n"
        f"Matches ingested : {total_matches}\n"
        f"Teams generated  : {len(team_stats)}\n"
        f"Output           : {OUTPUT_FILE}\n"
    )


# =========================
# ENTRY
# =========================

if __name__ == "__main__":
    run_builder()
