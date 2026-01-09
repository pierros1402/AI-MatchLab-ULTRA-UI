import os, json, glob
from datetime import datetime

FT_DIR = os.path.join("data","ft")
PRED_DIR = os.path.join("data","predictions")
OUT_DIR = os.path.join("data","eval")
OUT_PATH = os.path.join(OUT_DIR, "eval_dataset.jsonl")

os.makedirs(OUT_DIR, exist_ok=True)

def load_ft():
    ft = {}
    for f in glob.glob(os.path.join(FT_DIR, "ft_*.json")):
        with open(f, "r", encoding="utf-8") as fh:
            day = json.load(fh)
            for m in day.get("matches", []):
                ft[m["fixture_id"]] = m
    return ft

def load_predictions():
    preds = {}
    for f in glob.glob(os.path.join(PRED_DIR, "*.json")):
        with open(f, "r", encoding="utf-8") as fh:
            snap = json.load(fh)
            fid = snap.get("fixture_id")
            if not fid: continue
            preds.setdefault(fid, []).append(snap)
    return preds

def pick_latest_pre_kickoff(pred_list, kickoff_ts):
    cands = [p for p in pred_list if p.get("ts", 0) < kickoff_ts]
    if not cands: return None
    return sorted(cands, key=lambda x: x.get("ts", 0))[-1]

def main():
    ft = load_ft()
    preds = load_predictions()

    written = 0
    with open(OUT_PATH, "w", encoding="utf-8") as out:
        for fid, m in ft.items():
            kickoff_ts = m.get("kickoff_ts")
            if not kickoff_ts or fid not in preds: continue
            p = pick_latest_pre_kickoff(preds[fid], kickoff_ts)
            if not p: continue

            rec = {
                "fixture_id": fid,
                "league": m.get("league"),
                "kickoff_ts": kickoff_ts,
                "ft": {"home": m.get("goals_home"), "away": m.get("goals_away")},
                "pred": {
                    "p_home": p.get("p_home"),
                    "p_draw": p.get("p_draw"),
                    "p_away": p.get("p_away"),
                }
            }
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            written += 1

    print(f"[EVAL] Written {written} records to {OUT_PATH}")

if __name__ == "__main__":
    main()
