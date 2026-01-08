$bat = "C:\Users\pierr\Desktop\ai-matchlab-ultra-ui\odds-history-collector\run_odds_loop.bat"

Start-Process powershell `
  -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$bat`"" `
  -WindowStyle Hidden
