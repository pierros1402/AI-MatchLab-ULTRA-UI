\# Odds History Collector v1



\## Setup

1\. Python 3.10+

2\. `pip install -r requirements.txt`

3\. Edit `config.yaml` (API key)



\## Run

\- Manual: `python collector.py`

\- Cron: see `cron.example`



\## Output

Append-only JSONL snapshots under `odds-history/v1/`.



\## Guarantees

\- Deterministic offsets

\- Idempotent writes

\- No analytics / inference



