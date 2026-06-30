/* ===========================================================
   STATISTICS.JS — Persistent Match Statistics
   Stores aggregate stats in LocalStorage (no backend, no DB).
=========================================================== */

window.TTT = window.TTT || {};

TTT.Stats = (function(){

  const STORAGE_KEY = 'ttt_lupy_statistics_v1';

  const DEFAULTS = {
    totalMatch: 0,
    totalWin: 0,
    totalLose: 0,
    totalDraw: 0,
    totalSeconds: 0,
    sizeCounts: { 3: 0, 5: 0, 7: 0 },
    modeCounts: { pvp: 0, easy: 0, medium: 0, hard: 0, impossible: 0 },
    winStreak: 0
  };

  function cloneDefaults(){ return JSON.parse(JSON.stringify(DEFAULTS)); }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return cloneDefaults();
      const parsed = JSON.parse(raw);
      return Object.assign(cloneDefaults(), parsed);
    } catch(e){
      return cloneDefaults();
    }
  }

  function save(data){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e){ /* storage unavailable — fail silently */ }
  }

  let state = load();

  /**
   * Records the outcome of a completed match.
   * outcome: 'win' | 'lose' | 'draw'
   */
  function recordMatch({ outcome, durationSeconds, size, mode }){
    state.totalMatch += 1;
    state.totalSeconds += Math.max(0, Math.round(durationSeconds || 0));
    state.sizeCounts[size] = (state.sizeCounts[size] || 0) + 1;
    state.modeCounts[mode] = (state.modeCounts[mode] || 0) + 1;

    if(outcome === 'win'){
      state.totalWin += 1;
      state.winStreak += 1;
    } else if(outcome === 'lose'){
      state.totalLose += 1;
      state.winStreak = 0;
    } else {
      state.totalDraw += 1;
      state.winStreak = 0;
    }

    save(state);
    return state.winStreak;
  }

  function getWinStreak(){ return state.winStreak; }

  function getSummary(){
    const winRate = state.totalMatch > 0
      ? Math.round((state.totalWin / state.totalMatch) * 100)
      : 0;

    const favoriteSize = Object.entries(state.sizeCounts)
      .sort((a,b) => b[1] - a[1])[0];
    const favoriteMode = Object.entries(state.modeCounts)
      .sort((a,b) => b[1] - a[1])[0];

    const modeLabels = {
      pvp: 'Player vs Player', easy: 'Bot Easy', medium: 'Bot Medium',
      hard: 'Bot Hard', impossible: 'Bot Impossible'
    };

    return {
      totalMatch: state.totalMatch,
      totalWin: state.totalWin,
      totalLose: state.totalLose,
      totalDraw: state.totalDraw,
      winRate,
      totalMinutes: Math.round(state.totalSeconds / 60),
      favoriteSize: favoriteSize && favoriteSize[1] > 0 ? `${favoriteSize[0]}×${favoriteSize[0]}` : '—',
      favoriteMode: favoriteMode && favoriteMode[1] > 0 ? modeLabels[favoriteMode[0]] : '—'
    };
  }

  function reset(){
    state = cloneDefaults();
    save(state);
  }

  return { recordMatch, getSummary, reset, getWinStreak };
})();
