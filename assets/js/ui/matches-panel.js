/* =========================================================
   MATCHES PANEL — AI MatchLab ULTRA (STABLE)
   ---------------------------------------------------------
   - Shows matches for selected league
   - Saved-only toggle identical to Today panel
========================================================= */

(function(){
  "use strict";
  if (window.__AIML_MATCHES_PANEL_INIT__) return;
  window.__AIML_MATCHES_PANEL_INIT__ = true;

  const listEl = document.getElementById("matches-list");
  if (!listEl) return;

  const state = { league: null, savedOnly: false, allMatches: [] };

  function emitBus(name,payload){
    try{
      if(typeof window.emitBus==="function") window.emitBus(name,payload);
      else if(typeof window.emit==="function") window.emit(name,payload);
      else document.dispatchEvent(new CustomEvent(name,{detail:payload}));
    }catch(_){}
  }

  function onBus(name,fn){
    try{
      if(typeof window.onBus==="function") return window.onBus(name,fn);
      if(typeof window.on==="function") return window.on(name,fn);
    }catch(_){}
    document.addEventListener(name,e=>fn(e&&e.detail));
  }

  function escapeHtml(s){return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
  function hasSavedStore(){return !!(window.SavedStore&&typeof window.SavedStore.isSaved==="function"&&typeof window.SavedStore.toggle==="function");}
  function isSaved(id){try{return hasSavedStore()?!!window.SavedStore.isSaved(id):false;}catch{return false;}}

  function ensureControls(){
    if(document.getElementById("matches-controls"))return;
    const wrap=document.createElement("div");
    wrap.id="matches-controls";
    wrap.innerHTML=`<button id="matches-saved-only" class="tc-toggle" type="button">Saved only</button>`;
    listEl.parentNode.insertBefore(wrap,listEl);

    const btn=document.getElementById("matches-saved-only");
    if(btn){
      btn.addEventListener("click",()=>{
        state.savedOnly=!state.savedOnly;
        btn.classList.toggle("on",state.savedOnly);
        render();
      });
    }
  }

  function render(){
    ensureControls();
    const all = Array.isArray(state.allMatches)?state.allMatches:[];
    const matches = state.savedOnly ? all.filter(m=>isSaved(m.id)) : all;
    if(!matches.length){
      const msg=state.savedOnly?"No saved matches in this league.":"No matches for this league.";
      listEl.innerHTML=`<div class="nav-empty">${escapeHtml(msg)}</div>`;
      return;
    }
    listEl.innerHTML = matches.map(m=>{
      const saved=isSaved(m.id);
      return `
        <div class="match-item" data-id="${escapeHtml(m.id)}" data-home="${escapeHtml(m.home)}" data-away="${escapeHtml(m.away)}">
          <div class="m-left">
            <div class="m-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
            <div class="m-sub">${escapeHtml(m.time||"")} · ${escapeHtml(m.leagueName||"")}</div>
          </div>
          <div class="m-actions">
            <div class="m-btn m-details" title="Details">i</div>
            <div class="m-btn m-star ${saved?"active":""}" title="${saved?"Unsave":"Save"}">${saved?"★":"☆"}</div>
          </div>
        </div>`;
    }).join("");
  }

  function attachHandlers(){
    if(listEl.__matchesHandlers)return;
    listEl.__matchesHandlers=true;
    listEl.addEventListener("click",ev=>{
      const item=ev.target.closest(".match-item");
      if(!item)return;
      const match={id:item.getAttribute("data-id"),home:item.getAttribute("data-home"),away:item.getAttribute("data-away")};
      if(ev.target.closest(".m-details")){emitBus("details-open",match);return;}
      if(ev.target.closest(".m-star")&&hasSavedStore()){
        const nowSaved=window.SavedStore.toggle(match);
        ev.target.classList.toggle("active",!!nowSaved);
        ev.target.textContent=nowSaved?"★":"☆";
        if(state.savedOnly)render();
        emitBus("saved-updated",{id:match.id,match});
        return;
      }
      emitBus("match-selected",match);
    });
    onBus("saved-store:updated",()=>render());
  }

  function acceptLeague(payload){
    if(!payload)return;
    state.league=payload;
    state.allMatches=(payload.matches&&payload.matches.length)?payload.matches:[
      {id:"M1",home:"Liverpool",away:"Chelsea",time:"21:00",leagueName:payload.name||""},
      {id:"M2",home:"Arsenal",away:"Man City",time:"22:00",leagueName:payload.name||""},
      {id:"M3",home:"Barcelona",away:"Real Madrid",time:"23:00",leagueName:payload.name||""}
    ];
    render();
  }

  function init(){ensureControls();attachHandlers();render();}
  onBus("league-selected",acceptLeague);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
