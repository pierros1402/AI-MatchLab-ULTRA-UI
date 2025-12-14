/* =========================================================
   AI MatchLab ULTRA — matches-panel.js
   - Listens: league-selected
   - Renders demo matches into #matches-list
   - Emits: match-selected (single source of truth)
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_MATCHES_PANEL_INIT__) return;
  window.__AIML_MATCHES_PANEL_INIT__ = true;

  const matchesList = document.getElementById('matches-list');
  if (!matchesList) console.warn('[matches] #matches-list missing');

  function setActiveMatchBar(match) {
    const bar = document.getElementById('active-match-bar');
    if (!bar) return;
    const t = bar.querySelector('.amb-title');
    const s = bar.querySelector('.amb-sub');
    if (t) t.textContent = `${match.home} vs ${match.away}`;
    if (s) s.textContent = `${(match.leagueName || '').trim()}${match.kickoff ? ' • ' + match.kickoff : ''}`.trim();
  }

  function demoMatchesForLeague(league) {
    const leagueName = league?.name || 'League';
    const leagueId = league?.id || 'L-DEMO';

    return [
      { id: `${leagueId}-1`, home: 'Home FC', away: 'Away FC', kickoff: '19:30', leagueId, leagueName },
      { id: `${leagueId}-2`, home: 'United', away: 'City', kickoff: '20:00', leagueId, leagueName },
      { id: `${leagueId}-3`, home: 'Athletic', away: 'Rovers', kickoff: '21:15', leagueId, leagueName },
      { id: `${leagueId}-4`, home: 'Sporting', away: 'Dynamo', kickoff: '22:00', leagueId, leagueName },
      { id: `${leagueId}-5`, home: 'Real', away: 'Olympic', kickoff: '18:45', leagueId, leagueName },
      { id: `${leagueId}-6`, home: 'Wanderers', away: 'Racing', kickoff: '23:00', leagueId, leagueName },
    ];
  }

  function renderMatches(matches) {
    if (!matchesList) return;
    matchesList.innerHTML = '';

    matches.forEach(m => {
      const row = document.createElement('div');
      row.className = 'row match-row';
      row.setAttribute('data-match-id', m.id);
      row.setAttribute('data-home', m.home);
      row.setAttribute('data-away', m.away);
      row.setAttribute('data-kickoff', m.kickoff || '');
      row.setAttribute('data-league-id', m.leagueId || '');
      row.setAttribute('data-league-name', m.leagueName || '');

      row.innerHTML = `
        <div><strong class="m-home">${m.home}</strong> vs <strong class="m-away">${m.away}</strong></div>
        <div class="sub"><span class="m-time">${m.kickoff || ''}</span>${m.leagueName ? ' • ' + m.leagueName : ''}</div>
      `;
      matchesList.appendChild(row);
    });
  }

  function parseMatchFromRow(row) {
    return {
      id: row.getAttribute('data-match-id') || '',
      home: row.getAttribute('data-home') || '',
      away: row.getAttribute('data-away') || '',
      kickoff: row.getAttribute('data-kickoff') || '',
      leagueId: row.getAttribute('data-league-id') || '',
      leagueName: row.getAttribute('data-league-name') || ''
    };
  }

  // Click -> match-selected
  if (matchesList) {
    matchesList.addEventListener('click', (ev) => {
      const row = ev.target.closest('.match-row,[data-match-id]');
      if (!row) return;

      const match = parseMatchFromRow(row);
      if (!match.id) return console.warn('[matches] clicked row without match id');

      setActiveMatchBar(match);
      if (window.emit) window.emit('match-selected', match);
    });
  }

  // When a league is selected -> fill matches + open matches panel
  if (window.on) {
    window.on('league-selected', (league) => {
      const matches = demoMatchesForLeague(league);
      renderMatches(matches);

      if (window.openAccordion) window.openAccordion('panel-matches');
    });
  }

})();
