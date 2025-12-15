/* =========================================================
   AI MatchLab ULTRA — matches-panel.js (STABLE)
   - Listens: league-selected
   - Renders demo matches into #matches-list
   - Adds actions: Details (i) + Saved (★)
   - Emits: match-selected (row click) + details-open (details click)
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_MATCHES_PANEL_INIT__) return;
  window.__AIML_MATCHES_PANEL_INIT__ = true;

  const matchesList = document.getElementById('matches-list');
  if (!matchesList) {
    console.warn('[matches] #matches-list missing');
    return;
  }

  // Make sure list has expected class for CSS (safe)
  try { matchesList.classList.add('matches-list'); } catch (_) {}

  function emitBus(name, payload) {
    if (typeof window.emit === 'function') window.emit(name, payload);
    else {
      try { document.dispatchEvent(new CustomEvent(name, { detail: payload })); } catch (_) {}
    }
  }

  function setActiveMatchBar(match) {
    const bar = document.getElementById('active-match-bar');
    if (!bar) return;
    const t = bar.querySelector('.amb-title');
    const s = bar.querySelector('.amb-sub');
    if (t) t.textContent = `${match.home} vs ${match.away}`;
    if (s) s.textContent = `${(match.leagueName || '').trim()}${match.kickoff ? ' • ' + match.kickoff : ''}`.trim();
  }

  // SavedStore adapter (optional)
  function hasSavedStore() {
    return !!(window.SavedStore && typeof window.SavedStore.toggle === 'function' && typeof window.SavedStore.isSaved === 'function');
  }
  function isSaved(matchId) {
    try { return hasSavedStore() ? !!window.SavedStore.isSaved(matchId) : false; } catch { return false; }
  }
  function toggleSaved(match) {
    try { return hasSavedStore() ? window.SavedStore.toggle(match) : null; } catch { return null; }
  }

  function demoMatchesForLeague(league) {
    const leagueName = league?.name || 'League';
    const leagueId = league?.id || 'L-DEMO';

    return [
      { id: `${leagueId}-1`, matchId: `${leagueId}-1`, home: 'Home FC', away: 'Away FC', kickoff: '19:30', leagueId, leagueName },
      { id: `${leagueId}-2`, matchId: `${leagueId}-2`, home: 'United', away: 'City', kickoff: '20:00', leagueId, leagueName },
      { id: `${leagueId}-3`, matchId: `${leagueId}-3`, home: 'Athletic', away: 'Rovers', kickoff: '21:15', leagueId, leagueName },
      { id: `${leagueId}-4`, matchId: `${leagueId}-4`, home: 'Sporting', away: 'Dynamo', kickoff: '22:00', leagueId, leagueName },
      { id: `${leagueId}-5`, matchId: `${leagueId}-5`, home: 'Real', away: 'Olympic', kickoff: '18:45', leagueId, leagueName },
      { id: `${leagueId}-6`, matchId: `${leagueId}-6`, home: 'Wanderers', away: 'Racing', kickoff: '23:00', leagueId, leagueName },
    ];
  }

  function renderMatches(matches) {
    matchesList.innerHTML = '';

    matches.forEach(m => {
      const matchId = m.matchId || m.id;

      const card = document.createElement('div');
      card.className = 'match-card';
      card.setAttribute('data-match-id', matchId);
      card.setAttribute('data-home', m.home);
      card.setAttribute('data-away', m.away);
      card.setAttribute('data-kickoff', m.kickoff || '');
      card.setAttribute('data-league-id', m.leagueId || '');
      card.setAttribute('data-league-name', m.leagueName || '');

      const saved = isSaved(matchId);

      card.innerHTML = `
        <div class="match-row">
          <div class="match-left">
            <div><span class="match-team">${m.home}</span> <span class="match-vs">vs</span> <span class="match-team">${m.away}</span></div>
            <div class="sub"><span class="m-time">${m.kickoff || ''}</span>${m.leagueName ? ' • ' + m.leagueName : ''}</div>
          </div>

          <div class="match-actions" style="display:flex;gap:10px;align-items:center;">
            <span class="details-btn" title="Details" aria-label="Details"
                  style="cursor:pointer;opacity:.75;font-weight:900;">i</span>
            <span class="fav-btn ${saved ? 'active' : ''}" title="${saved ? 'Unsave' : 'Save'}"
                  aria-label="${saved ? 'Unsave' : 'Save'}">${saved ? '★' : '☆'}</span>
          </div>
        </div>
      `;

      matchesList.appendChild(card);
    });
  }

function parseMatchFromCard(card) {
  let id = card.getAttribute('data-match-id') || '';
  const home = card.getAttribute('data-home') || '';
  const away = card.getAttribute('data-away') || '';
  const kickoff = card.getAttribute('data-kickoff') || '';
  const leagueId = card.getAttribute('data-league-id') || '';
  const leagueName = card.getAttribute('data-league-name') || '';

  // fallback id generation if missing
  if (!id || id === 'undefined' || id === 'null') {
    id = `${leagueId || 'LEAGUE'}:${home.replace(/\s+/g, '_')}-vs-${away.replace(/\s+/g, '_')}:${kickoff || 'TBD'}`;
  }
  if (!id || id === 'undefined' || id === 'null') {
    const h = home ? home.replace(/\s+/g, '_') : 'HOME';
    const a = away ? away.replace(/\s+/g, '_') : 'AWAY';
    id = `${leagueId || 'LEAGUE'}:${h}-vs-${a}:${kickoff || 'TBD'}`;
  }

  return {
    id,
    matchId: id,
    home,
    away,
    kickoff,
    leagueId,
    leagueName
  };
}

  // Delegated clicks
  matchesList.addEventListener('click', (ev) => {
    const card = ev.target.closest('.match-card,[data-match-id]');
    if (!card) return;

    const match = parseMatchFromCard(card);
    if (!match.id) return;

    // Details
    const detailsBtn = ev.target.closest('.details-btn');
    if (detailsBtn) {
      ev.preventDefault(); ev.stopPropagation();
      setActiveMatchBar(match);
      emitBus('match-selected', match);
      emitBus('details-open', match);
      emitBus('details:open', match); // compatibility
      return;
    }

    // Saved
    const starBtn = ev.target.closest('.fav-btn');
    if (starBtn) {
      ev.preventDefault(); ev.stopPropagation();
      const nowSaved = toggleSaved(match);
      if (nowSaved === null) return;

      starBtn.classList.toggle('active', !!nowSaved);
      starBtn.textContent = nowSaved ? '★' : '☆';
      starBtn.title = nowSaved ? 'Unsave' : 'Save';

      // SavedStore.persist συνήθως κάνει emit, αλλά εκπέμπουμε και εμείς για σιγουριά
      emitBus('saved-updated', { id: match.matchId, match: match });
      return;
    }

    // Row click => select
    setActiveMatchBar(match);
    emitBus('match-selected', match);
  });

  // When a league is selected -> fill matches + open matches panel
  if (typeof window.on === 'function') {
    window.on('league-selected', (league) => {
      const matches = demoMatchesForLeague(league);
      renderMatches(matches);

      if (typeof window.openAccordion === 'function') window.openAccordion('panel-matches');
    });

    // keep stars synced if something else updates saved
    window.on('saved-updated', () => {
      const cards = matchesList.querySelectorAll('.match-card[data-match-id]');
      cards.forEach(card => {
        const id = card.getAttribute('data-match-id');
        const star = card.querySelector('.fav-btn');
        if (!id || !star) return;
        const s = isSaved(id);
        star.classList.toggle('active', s);
        star.textContent = s ? '★' : '☆';
        star.title = s ? 'Unsave' : 'Save';
      });
    });
  }

})();
