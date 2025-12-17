/* =========================================================
   AI MatchLab ULTRA — RIGHT PANELS (accent + stable)
   --------------------------------------------------------
   IDs:
     Radar list:        #radar-list
     Top picks list:    #picks-list
     Value picks list:  #value-picks-list
     Live list:         #live-list
========================================================= */

(function(){
  "use strict";

  const els = {
    radarList: document.getElementById('radar-list'),
    picksList: document.getElementById('picks-list'),
    valueList: document.getElementById('value-picks-list'),
    liveList:  document.getElementById('live-list'),

    radarMeta: document.getElementById('radar-meta'),
    picksMeta: document.getElementById('picks-meta'),
    valueMeta: document.getElementById('value-picks-meta'),
    liveMeta:  document.getElementById('live-meta')
  };

  function setMeta(el, text){ if (el) el.textContent = text; }

  function renderList(container, items, htmlFn, emptyText){
    if (!container) return;
    container.innerHTML = '';
    if (!items || !items.length){
      container.innerHTML = `<div class="right-empty">${emptyText || 'No data'}</div>`;
      return;
    }
    for (const it of items){
      const row = document.createElement('div');
      row.className = 'right-item';
      row.innerHTML = htmlFn(it);
      // add attributes only if exist
      if (it._tone)   row.dataset.tone   = it._tone;
      if (it._strong) row.dataset.strong = it._strong;
      container.appendChild(row);
    }
  }

  /* -----------------------------
     PANEL 2:  TOP PICKS
  ----------------------------- */
  const demoTopPicks = [
    { match: "Barcelona vs Sevilla",  form: 9.1, motivation: "High",    rank: 1 },
    { match: "Man City vs Arsenal",   form: 8.8, motivation: "Medium",  rank: 2 },
    { match: "Panathinaikos vs AEK",  form: 7.9, motivation: "High",    rank: 3 },
    { match: "PSG vs Monaco",         form: 6.2, motivation: "Low",     rank: 4 }
  ];

  function renderTopPicks(){
    const picks = demoTopPicks.map(p=>{
      const tone   = p.form >= 8 ? "positive" : p.form <= 6 ? "negative" : "neutral";
      const strong = p.form >= 9 ? "true" : "false";
      return { ...p, _tone:tone, _strong:strong };
    });

    renderList(els.picksList, picks, it => `
      <div class="right-main"><strong>${it.match}</strong></div>
      <div class="right-sub">Form ${it.form.toFixed(1)} · Motivation ${it.motivation} · AI Rank #${it.rank}</div>
    `, 'Offline (demo)');
    setMeta(els.picksMeta, `AI Stats demo · ${picks.length}`);
  }

  /* -----------------------------
     PANEL 3:  VALUE PICKS
  ----------------------------- */
  const demoValueSignals = [
    { match: "Atalanta vs Napoli",    edge: 12.4, label: "Overreaction" },
    { match: "Liverpool vs Chelsea",  edge: 5.8,  label: "Sharp drift" },
    { match: "Olympiacos vs PAOK",    edge: -2.6, label: "Overvalued" },
    { match: "Juventus vs Milan",     edge: 9.9,  label: "Market lag" }
  ];

  function renderValue(){
    const values = demoValueSignals.map(v=>{
      const tone   = v.edge > 10 ? "positive" : v.edge < 0 ? "negative" : "neutral";
      const strong = Math.abs(v.edge) >= 10 ? "true" : "false";
      return { ...v, _tone:tone, _strong:strong };
    });

    renderList(els.valueList, values, it => `
      <div class="right-main"><strong>${it.match}</strong></div>
      <div class="right-sub">Edge ${it.edge.toFixed(1)}% · ${it.label}</div>
    `, 'Offline (demo)');
    setMeta(els.valueMeta, `AI vs Market · ${values.length}`);
  }

  /* -----------------------------
     PANEL 1:  RADAR
  ----------------------------- */
  function renderRadar(moves){
    renderList(els.radarList, moves, it => `
      <div class="right-main"><strong>${it.match}</strong></div>
      <div class="right-sub">Δ ${Number(it.delta).toFixed(2)} · ${it.bookmaker}${it.label ? " · " + it.label : ""}</div>
    `, 'No significant moves');
    setMeta(els.radarMeta, moves.length ? `Δ≥0.20 · ${moves.length}` : 'No significant moves');
  }

  /* -----------------------------
     PANEL 4:  LIVE
  ----------------------------- */
  function renderLive(list){
    renderList(els.liveList, list, it => `
      <div class="right-main"><strong>${it.home} vs ${it.away}</strong></div>
      <div class="right-sub">${it.minute}' · ${it.score || "0 - 0"}</div>
    `, 'Service offline');
    setMeta(els.liveMeta, list && list.length ? `Live (demo) · ${list.length}` : 'Service offline');
  }

  /* -----------------------------
     EVENT BINDING
  ----------------------------- */
  function onSafe(ev, fn){
    if (typeof window.on === 'function') window.on(ev, fn);
    else document.addEventListener(ev, (e)=>fn(e.detail));
  }

  onSafe('radar-moves:update', payload=>{
    const moves = Array.isArray(payload?.moves) ? payload.moves : [];
    renderRadar(moves);
  });

  onSafe('live-demo:update', payload=>{
    const list = Array.isArray(payload?.matches) ? payload.matches : [];
    renderLive(list);
  });

  /* -----------------------------
     INITIAL RENDER
  ----------------------------- */
  renderTopPicks();
  renderValue();
  renderLive([]);

  console.log('[RIGHT] Right panels ready (accent + stable).');
// === global delegated click → center odds (με ομαδικά ονόματα) ===
document.addEventListener('click', (e) => {
  const el = e.target.closest('#right-panel .right-item');
  if (!el) return;

  // Πάρε τίτλο (home vs away) από το στοιχείο
  const titleEl = el.querySelector('.right-main strong');
  const title = titleEl ? titleEl.textContent.trim() : el.textContent.trim();

  // Απόσπαση ονομάτων ομάδων
  let home = '', away = '';
  if (title.includes(' vs ')) {
    [home, away] = title.split(' vs ').map(s => s.trim());
  } else {
    // fallback: μπορεί να είναι "TeamA - TeamB" ή μόνο ένα όνομα
    const parts = title.split(/[-–]/);
    home = parts[0]?.trim() || 'Home';
    away = parts[1]?.trim() || 'Away';
  }

  const id = title.replace(/\s+/g, '_').toLowerCase();

  window.emit?.('match-selected', { id, home, away, title });

  // κλείσε το δεξί drawer στο mobile
  document.body.classList.remove('drawer-right-open');
});

})();
