/* ===========================================================
   SETTINGS.JS — Preferences + Sound Engine
   Sound is generated with the WebAudio API (no external audio files
   needed) so the experience works fully offline / backend-free.
=========================================================== */

window.TTT = window.TTT || {};

TTT.Settings = (function(){

  const STORAGE_KEY = 'ttt_lupy_settings_v1';

  const DEFAULTS = {
    theme: 'dark',
    soundOn: false,
    volume: 60,
    timerSeconds: 15 // 0 = unlimited
  };

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { ...DEFAULTS };
      return Object.assign({ ...DEFAULTS }, JSON.parse(raw));
    } catch(e){
      return { ...DEFAULTS };
    }
  }

  function save(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ /* ignore */ }
  }

  let state = load();

  /* ---------------- WebAudio sound engine ---------------- */
  let audioCtx = null;
  function ctx(){
    if(!audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function tone(freq, duration, type, volMul){
    if(!state.soundOn) return;
    try{
      const ac = ctx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const vol = (state.volume / 100) * (volMul || 0.2);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch(e){ /* audio unavailable */ }
  }

  const Sound = {
    click(){ tone(660, 0.08, 'sine', 0.15); },
    place(){ tone(420, 0.12, 'triangle', 0.22); },
    victory(){
      tone(523, 0.15, 'sine', 0.25);
      setTimeout(() => tone(659, 0.15, 'sine', 0.25), 130);
      setTimeout(() => tone(784, 0.25, 'sine', 0.25), 260);
    },
    defeat(){
      tone(300, 0.18, 'sawtooth', 0.18);
      setTimeout(() => tone(220, 0.3, 'sawtooth', 0.18), 150);
    },
    draw(){ tone(380, 0.2, 'square', 0.15); },
    tick(){ tone(880, 0.05, 'sine', 0.08); }
  };

  /* ---------------- Public getters/setters ---------------- */
  function getTheme(){ return state.theme; }
  function setTheme(t){ state.theme = t; save(); }

  function isSoundOn(){ return state.soundOn; }
  function setSoundOn(v){ state.soundOn = v; save(); }

  function getVolume(){ return state.volume; }
  function setVolume(v){ state.volume = v; save(); }

  function getTimerSeconds(){ return state.timerSeconds; }
  function setTimerSeconds(v){ state.timerSeconds = v; save(); }

  return {
    getTheme, setTheme, isSoundOn, setSoundOn,
    getVolume, setVolume, getTimerSeconds, setTimerSeconds,
    Sound
  };
})();
