# =========================================================
# VALUE ENGINE — PRE MATCH (STATS-BASED)
# MODULE VERSION — FINAL
#
# ✔ Input: matches (list of dicts)
# ✔ Output: value picks (list of dicts)
# ✔ Uses: value/team_stats.json
#
# This module DOES NOT:
# - read fixtures from disk
# - fetch data
# - touch KV
# =========================================================

import json
import os

# =========================
# CONFIG (LOCKED)
# =========================

TEAM_STATS_FILE = "value/team_stats.json"

MIN_MATCHES = 8

BTTS_THRESHOLD = 0.60
OVER25_THRESHOLD = 0.55

# =========================
# INTERNAL HELPERS
# =========================

def _load_team_stats():
    if not os.path.exists(TEAM_STATS_FILE):
        raise FileNotFoundError(
            f"Missing team stats file: {TEAM_STATS_FILE}"
        )

    with open(TEAM_STATS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _extract_team_ids(match):
    """
    Accepts multiple schemas:
    - homeId / awayId
    - home / away
    """
    home = match.get("homeId") or match.get("home")
    away = match.get("awayId") or match.get("away")
    return home, away


# =========================
# PUBLIC API
# =========================

def compute_value_picks(matches):
    """
    Compute value picks for upcoming matches.

    Parameters:
        matches (list): list of match dicts
            required keys per match:
              - homeId or home
              - awayId or away

    Returns:
        list of value pick dicts
    """

    if not isinstance(matches, list):
        raise TypeError("matches must be a list")

    team_stats = _load_team_stats()
    value_picks = []

    for m in matches:
        if not isinstance(m, dict):
            continue

        home, away = _extract_team_ids(m)

        if not home or not away:
            continue

        hstats = team_stats.get(home)
        astats = team_stats.get(away)

        if not hstats or not astats:
            continue

        if (
            hstats.get("matches_used", 0) < MIN_MATCHES
            or astats.get("matches_used", 0) < MIN_MATCHES
        ):
            continue

        # -----------------------
        # BTTS
        # -----------------------
        btts_score = (
            hstats["btts_rate"] + astats["btts_rate"]
        ) / 2

        if btts_score >= BTTS_THRESHOLD:
            value_picks.append({
                "home": home,
                "away": away,
                "market": "BTTS",
                "score": round(btts_score, 3)
            })

        # -----------------------
        # Over 2.5
        # -----------------------
        over25_score = (
            hstats["over25_rate"] + astats["over25_rate"]
        ) / 2

        if over25_score >= OVER25_THRESHOLD:
            value_picks.append({
                "home": home,
                "away": away,
                "market": "Over 2.5",
                "score": round(over25_score, 3)
            })

    return value_picks
