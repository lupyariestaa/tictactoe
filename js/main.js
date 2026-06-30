/* ===========================================================
   MAIN.JS — App Controller
   Navigation between screens, Three.js space background,
   theme handling, menu wiring, settings/statistics binding.
=========================================================== */

window.TTT = window.TTT || {};

/* ===================== TOAST HELPER ===================== */
TTT.UI = (function(){
  function toast(message, duration){
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    if(window.gsap){
      gsap.fromTo(el, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
    }
    window.setTimeout(() => {
      if(window.gsap){
        gsap.to(el, { opacity: 0, y: -10, duration: 0.3, onComplete: () => el.remove() });
      } else { el.remove(); }
    }, duration || 2200);
  }
  return { toast };
})();


/* ===================== THREE.JS SPACE BACKGROUND ===================== */
TTT.SpaceBackground = (function(){
  let scene, camera, renderer, stars, nebula, particles, planet;
  let mouseX = 0, mouseY = 0;
  let frame = null;

  function init(){
    const canvas = document.getElementById('space-canvas');
    if(!window.THREE || !canvas) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    buildStars();
    buildNebula();
    buildGalaxyParticles();
    buildPlanet();

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    animate();
  }

  function buildStars(){
    const count = window.innerWidth < 600 ? 900 : 1800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for(let i = 0; i < count; i++){
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.85 });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);
  }

  function buildNebula(){
    const geo = new THREE.SphereGeometry(70, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6, transparent: true, opacity: 0.05, side: THREE.BackSide
    });
    nebula = new THREE.Mesh(geo, mat);
    nebula.position.set(-20, 10, -80);
    scene.add(nebula);

    const geo2 = new THREE.SphereGeometry(50, 24, 24);
    const mat2 = new THREE.MeshBasicMaterial({
      color: 0x22D3EE, transparent: true, opacity: 0.045, side: THREE.BackSide
    });
    const nebula2 = new THREE.Mesh(geo2, mat2);
    nebula2.position.set(40, -15, -60);
    scene.add(nebula2);
  }

  function buildGalaxyParticles(){
    const count = window.innerWidth < 600 ? 300 : 600;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colorChoices = [new THREE.Color(0x8B5CF6), new THREE.Color(0xA855F7), new THREE.Color(0x22D3EE)];
    const colors = new Float32Array(count * 3);
    for(let i = 0; i < count; i++){
      const radius = 30 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 40;
      const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, opacity: 0.7 });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  function buildPlanet(){
    const geo = new THREE.SphereGeometry(9, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6D28D9, emissive: 0x22D3EE, emissiveIntensity: 0.12, roughness: 0.6, metalness: 0.3
    });
    planet = new THREE.Mesh(geo, mat);
    planet.position.set(28, 14, -70);
    scene.add(planet);

    const ringGeo = new THREE.RingGeometry(12, 14.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    planet.add(ring);

    const light = new THREE.PointLight(0xA855F7, 1.4, 200);
    light.position.set(0, 0, 40);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x404060, 1.2);
    scene.add(ambient);
  }

  function onResize(){
    if(!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(e){
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  function onTouchMove(e){
    if(!e.touches || !e.touches[0]) return;
    mouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }

  function animate(){
    frame = requestAnimationFrame(animate);
    if(stars) stars.rotation.y += 0.0006;
    if(particles) particles.rotation.y += 0.0011;
    if(nebula) nebula.rotation.y += 0.0004;
    if(planet) planet.rotation.y += 0.0018;

    // light parallax toward pointer — kept subtle so it never distracts from gameplay
    camera.position.x += (mouseX * 4 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, -40);

    renderer.render(scene, camera);
  }

  return { init };
})();


/* ===================== APP / NAVIGATION ===================== */
(function(){

  const SCREENS = ['menu', 'modes', 'game', 'settings', 'stats'];
  let appState = {
    playerName: '',
    selectedMode: null,
    selectedSize: 3,
    history: ['menu']
  };

  function $(sel){ return document.querySelector(sel); }
  function $id(id){ return document.getElementById(id); }

  function showScreen(name, opts){
    opts = opts || {};
    SCREENS.forEach(s => {
      $id('screen-' + s).classList.toggle('active', s === name);
    });
    const topbar = $id('topbar');
    if(name === 'menu'){
      topbar.classList.add('hidden');
    } else {
      topbar.classList.remove('hidden');
      $id('topbar-title').textContent = ({
        modes: 'Pilih Mode', game: 'Pertandingan', settings: 'Pengaturan', stats: 'Statistik'
      })[name] || 'Tic Tac Toe';
      $id('topbar-player').textContent = appState.playerName ? `👤 ${appState.playerName}` : '';
    }

    if(!opts.skipHistory){
      appState.history.push(name);
    }

    if(window.gsap){
      const el = $id('screen-' + name);
      gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }

    if(name === 'stats') refreshStatistics();
    if(name === 'settings') refreshSettingsUI();
  }

  function goBack(){
    if(appState.history.length > 1){
      appState.history.pop(); // discard current
      const prev = appState.history.pop() || 'menu';
      showScreen(prev);
    } else {
      showScreen('menu');
    }
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(theme){
    document.body.setAttribute('data-theme', theme);
    TTT.Settings.setTheme(theme);
    document.querySelectorAll('#seg-theme .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  function toggleTheme(){
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    TTT.Settings.Sound.click();
  }

  /* ---------------- Main Menu wiring ---------------- */
  function initMenu(){
    const nameInput = $id('player-name');
    const avatarPreview = $id('avatar-preview');

    const savedName = sessionStorage.getItem('ttt_player_name') || '';
    if(savedName){
      nameInput.value = savedName;
      appState.playerName = savedName;
      avatarPreview.textContent = savedName.charAt(0).toUpperCase();
    }

    nameInput.addEventListener('input', () => {
      const v = nameInput.value.trim();
      appState.playerName = v;
      avatarPreview.textContent = v ? v.charAt(0).toUpperCase() : '?';
      sessionStorage.setItem('ttt_player_name', v);
      if(window.gsap) gsap.fromTo(avatarPreview, { scale: 1.2 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
    });

    $id('btn-start').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      if(!appState.playerName){
        TTT.UI.toast('Masukkan nama pemain terlebih dahulu ✏️');
        nameInput.focus();
        return;
      }
      showScreen('modes');
    });

    $id('btn-settings').addEventListener('click', () => { TTT.Settings.Sound.click(); showScreen('settings'); });
    $id('btn-statistics').addEventListener('click', () => { TTT.Settings.Sound.click(); showScreen('stats'); });
    $id('btn-theme').addEventListener('click', toggleTheme);
  }

  /* ---------------- Mode / Size select ---------------- */
  function initModes(){
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        appState.selectedMode = card.dataset.mode;
        TTT.Settings.Sound.click();
      });
    });
    document.querySelectorAll('.size-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.size-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        appState.selectedSize = parseInt(card.dataset.size, 10);
        TTT.Settings.Sound.click();
      });
    });

    $id('btn-play').addEventListener('click', () => {
      if(!appState.selectedMode){
        TTT.UI.toast('Pilih mode permainan dahulu 🎮');
        return;
      }
      TTT.Settings.Sound.click();
      showScreen('game');
      TTT.Game.start({
        mode: appState.selectedMode,
        size: appState.selectedSize,
        playerName: appState.playerName
      });
    });
  }

  /* ---------------- Game screen wiring ---------------- */
  function initGameScreen(){
    $id('btn-restart').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      TTT.Game.restart();
    });
    $id('btn-quit').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      TTT.Game.quit();
      showScreen('modes');
    });
    $id('btn-play-again').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      TTT.Game.restart();
    });
    $id('btn-replay').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      TTT.Game.openReplay();
    });
    $id('btn-close-replay').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      TTT.Game.closeReplay();
    });
  }

  /* ---------------- Settings screen wiring ---------------- */
  function refreshSettingsUI(){
    document.querySelectorAll('#seg-theme .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === TTT.Settings.getTheme());
    });
    $id('toggle-sound').checked = TTT.Settings.isSoundOn();
    $id('range-volume').value = TTT.Settings.getVolume();
    document.querySelectorAll('#seg-timer .seg-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.timer, 10) === TTT.Settings.getTimerSeconds());
    });
  }

  function initSettingsScreen(){
    document.querySelectorAll('#seg-theme .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => { applyTheme(btn.dataset.theme); TTT.Settings.Sound.click(); });
    });

    $id('toggle-sound').addEventListener('change', (e) => {
      TTT.Settings.setSoundOn(e.target.checked);
      if(e.target.checked) TTT.Settings.Sound.click();
    });

    $id('range-volume').addEventListener('input', (e) => {
      TTT.Settings.setVolume(parseInt(e.target.value, 10));
    });
    $id('range-volume').addEventListener('change', () => TTT.Settings.Sound.click());

    document.querySelectorAll('#seg-timer .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#seg-timer .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        TTT.Settings.setTimerSeconds(parseInt(btn.dataset.timer, 10));
        TTT.Settings.Sound.click();
      });
    });

    $id('btn-reset-stats').addEventListener('click', () => {
      TTT.Stats.reset();
      refreshStatistics();
      TTT.UI.toast('Statistik telah direset 🗑️');
      TTT.Settings.Sound.click();
    });
  }

  /* ---------------- Statistics screen wiring ---------------- */
  function refreshStatistics(){
    const s = TTT.Stats.getSummary();
    $id('stat-total').textContent = s.totalMatch;
    $id('stat-win').textContent = s.totalWin;
    $id('stat-lose').textContent = s.totalLose;
    $id('stat-draw').textContent = s.totalDraw;
    $id('stat-winrate').textContent = s.winRate + '%';
    $id('stat-time').textContent = s.totalMinutes + 'm';
    $id('stat-size').textContent = s.favoriteSize;
    $id('stat-mode').textContent = s.favoriteMode;
  }

  /* ---------------- Topbar back ---------------- */
  function initTopbar(){
    $id('btn-back').addEventListener('click', () => {
      TTT.Settings.Sound.click();
      if(document.getElementById('screen-game').classList.contains('active')){
        TTT.Game.quit();
      }
      goBack();
    });
  }

  /* ---------------- Boot ---------------- */
  function boot(){
    applyTheme(TTT.Settings.getTheme());
    initMenu();
    initModes();
    initGameScreen();
    initSettingsScreen();
    initTopbar();
    showScreen('menu', { skipHistory: true });
    TTT.SpaceBackground.init();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
