@echo off
cd /d C:\Users\pierr\Desktop\ai-matchlab-ultra-ui\odds-history-collector

:loop
echo ========================================
echo Odds pipeline run %date% %time%
echo ========================================

python odds_collector_v2_core.py
python odds_normalizer_v1.py
python odds_deviation_engine_v1.py

echo Waiting 120 minutes...
timeout /t 7200 /nobreak >nul

goto loop
