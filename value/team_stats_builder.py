# =========================================================
# TEAM STATS BUILDER — PRE MATCH (FIXTURES TREE v1)
# v1.3 FINAL — GOALS-BASED FINISHED LOGIC
#
# ✔ Reads fixtures from odds-history-collector/fixtures/v1
# ✔ Finished = homeGoals & awayGoals exist
# ✔ No status assumptions
# ✔ Builds team_stats.json
# =========================================================

import json
import os
from statistics import mean

# =========================
# CONFIG
# =========================

FIXTURES_ROOT = "odds-history-collector/fixtures/v1"
OUTPUT_FILE = "value/team_stats.json"
LAST_N_MATCHES = 10

# =========================
# HELPERS
# =========================

def safe_mean(values):
    values = [v for v in values if isinstance(v, (int, float))]
    return mean(values) if values else 0.0


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def has_final_score(match):
    return (
        isinstance(match.get("homeGoals"), int)
        and isinstance(match.get("awayGoals"), int)
    )

# =========================
# MAIN
# =========================

def run_builder():
    team_matches = {}

    # -------------------------------------------------
    # Traverse fixtures tree
    # -------------------------------------------------
    for league_dir in sorted(os.listdir(FIXTURES_ROOT)):
        if not league_dir.startswith("league="):
            continue

        league_path = os.path.join(FIXTURES_ROOT, league_dir)
        if not os.path.isdir(league_path):
            continue

        for fname in sorted(os.listdir(league_path)):
            if not fname.startswith("date=") or not fname.endswith(".json"):
                continue

            fpath = os.path.join(league_path, fname)
            data = load_json(fpath)

            if not isinstance(data, list):
                continue

            for m in data:
                if not isinstance(m, dict):
                    continue

                # ✅ FINISHED = score exists
                if not has_final_score(m):
                    continue

                hid = m.get("homeId")
                aid = m.get("awayId")

                if not hid or not aid:
                    continue

                team_matches.setdefault(hid, []).append(m)
                team_matches.setdefault(aid, []).append(m)

    # -------------------------------------------------
    # Build per-team stats
    # -------------------------------------------------
    team_stats = {}

    for team_id, matches in team_matches.items():
        matches_sorted = sorted(
            matches,
            key=lambda x: x.get("kickoff", x.get("date", ""))
        )

        recent = matches_sorted[-LAST_N_MATCHES:]

        goals_for = []
        goals_against = []
        btts = []
        over25 = []

        for m in recent:
            if m.get("homeId") == team_id:
                gf = m.get("homeGoals")
                ga = m.get("awayGoals")
            else:
                gf = m.get("awayGoals")
                ga = m.get("homeGoals")

            goals_for.append(gf)
            goals_against.append(ga)
            btts.append(1 if gf > 0 and ga > 0 else 0)
            over25.append(1 if (gf + ga) >= 3 else 0)

        team_stats[team_id] = {
            "matches_used": len(recent),
            "goals_for_avg": round(safe_mean(goals_for), 3),
            "goals_against_avg": round(safe_mean(goals_against), 3),
            "btts_rate": round(safe_mean(btts), 3),
            "over25_rate": round(safe_mean(over25), 3)
        }

    # -------------------------------------------------
    # Write output
    # -------------------------------------------------
    os.makedirs("value", exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(team_stats, f, ensure_ascii=False, indent=2)

    print(
        f"[STATS] team_stats.json generated — "
        f"{len(team_stats)} teams (fixtures/v1)"
    )

# =========================
# ENTRY
# =========================

if __name__ == "__main__":
    run_builder()
