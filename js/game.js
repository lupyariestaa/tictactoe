/* ===========================================================
   GAME.JS — Core Gameplay Engine
   Board logic, turn flow, timer, win effects, replay, streak/lucky events.
=========================================================== */

window.TTT = window.TTT || {};

/* ===================== BOARD UTILITIES ===================== */
TTT.Board = (function(){

  const lineCache = {};

  function index(r, c, size){ return r * size + c; }

  function generateLines(size, winLen){
    const key = size + '_' + winLen;
    if(lineCache[key]) return lineCache[key];

    const lines = [];
    // Horizontal
    for(let r = 0; r < size; r++){
      for(let c = 0; c <= size - winLen; c++){
        const line = [];
        for(let i = 0; i < winLen; i++) line.push(index(r, c + i, size));
        lines.push(line);
      }
    }
    // Vertical
    for(let c = 0; c < size; c++){
      for(let r = 0; r <= size - winLen; r++){
        const line = [];
        for(let i = 0; i < winLen; i++) line.push(index(r + i, c, size));
        lines.push(line);
      }
    }
    // Diagonal ↘
    for(let r = 0; r <= size - winLen; r++){
      for(let c = 0; c <= size - winLen; c++){
        const line = [];
        for(let i = 0; i < winLen; i++) line.push(index(r + i, c + i, size));
        lines.push(line);
      }
    }
    // Diagonal ↙
    for(let r = 0; r <= size - winLen; r++){
      for(let c = winLen - 1; c < size; c++){
        const line = [];
        for(let i = 0; i < winLen; i++) line.push(index(r + i, c - i, size));
        lines.push(line);
      }
    }

    lineCache[key] = lines;
    return lines;
  }

  function createEmptyBoard(size){ return new Array(size * size).fill(null); }

  function getEmptyCells(board){
    const out = [];
    for(let i = 0; i < board.length; i++) if(board[i] === null) out.push(i);
    return out;
  }

  function checkWinner(board, size, winLen){
    const lines = generateLines(size, winLen);
    for(const line of lines){
      const first = board[line[0]];
      if(first === null) continue;
      let allMatch = true;
      for(let i = 1; i < line.length; i++){
        if(board[line[i]] !== first){ allMatch = false; break; }
      }
      if(allMatch) return { winner: first, isDraw: false, line };
    }
    const isDraw = getEmptyCells(board).length === 0;
    return { winner: null, isDraw, line: null };
  }

  function getLinesThrough(size, winLen, idx){
    return generateLines(size, winLen).filter(line => line.includes(idx));
  }

  function winLengthForSize(size){
    if(size === 3) return 3;
    if(size === 5) return 4;
    return 5; // size 7
  }

  return { createEmptyBoard, getEmptyCells, checkWinner, getLinesThrough, winLengthForSize };
})();


/* ===================== GAME ENGINE ===================== */
TTT.Game = (function(){

  let els = {};
  let state = null;

  function cacheEls(){
    els.board = document.getElementById('board');
    els.hudName1 = document.getElementById('hud-name-1');
    els.hudName2 = document.getElementById('hud-name-2');
    els.hudAvatar1 = document.getElementById('hud-avatar-1');
    els.hudAvatar2 = document.getElementById('hud-avatar-2');
    els.hudP1 = document.getElementById('hud-p1');
    els.hudP2 = document.getElementById('hud-p2');
    els.timerRing = document.getElementById('timer-ring');
    els.timerFg = document.getElementById('timer-fg');
    els.timerText = document.getElementById('timer-text');
    els.streakBadge = document.getElementById('streak-badge');
    els.luckyBadge = document.getElementById('lucky-badge');
    els.modalResult = document.getElementById('modal-result');
    els.resultIcon = document.getElementById('result-icon');
    els.resultTitle = document.getElementById('result-title');
    els.resultName = document.getElementById('result-name');
    els.resultMoves = document.getElementById('result-moves');
    els.resultDuration = document.getElementById('result-duration');
    els.modalConfetti = document.getElementById('modal-confetti');
    els.modalReplay = document.getElementById('modal-replay');
    els.replayBoard = document.getElementById('replay-board');
    els.replayMoveLabel = document.getElementById('replay-move-label');
  }

  function avatarLetter(name){
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  /* ---------------- Setup ---------------- */
  function start({ mode, size, playerName }){
    cacheEls();
    const winLen = TTT.Board.winLengthForSize(size);

    const isBot = mode !== 'pvp';
    state = {
      mode, size, winLen, isBot,
      board: TTT.Board.createEmptyBoard(size),
      current: 'X',
      moves: [],            // { idx, symbol } — used for replay
      gameOver: false,
      startedAt: Date.now(),
      timerHandle: null,
      timerRemaining: TTT.Settings.getTimerSeconds(),
      names: {
        X: playerName || 'Player 1',
        O: isBot ? 'Bot' : 'Player 2'
      },
      luckyGalaxy: Math.random() < 0.18,
      preStreak: TTT.Stats.getWinStreak()
    };

    els.hudName1.textContent = state.names.X;
    els.hudName2.textContent = state.names.O;
    els.hudAvatar1.textContent = avatarLetter(state.names.X);
    els.hudAvatar2.textContent = isBot ? '🤖' : avatarLetter(state.names.O);

    els.streakBadge.classList.toggle('hidden', state.preStreak < 3);
    els.luckyBadge.classList.toggle('hidden', !state.luckyGalaxy);

    renderBoardGrid();
    updateActivePlayerHUD();
    setupTimerUI();
    restartTimer();
  }

  function renderBoardGrid(){
    els.board.innerHTML = '';
    els.board.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    els.board.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;
    const fontScale = state.size === 3 ? '2.6em' : (state.size === 5 ? '1.6em' : '1.1em');

    for(let i = 0; i < state.size * state.size; i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = i;
      cell.style.fontSize = fontScale;
      cell.addEventListener('click', () => onCellClick(i, cell));
      els.board.appendChild(cell);
    }
  }

  function setupTimerUI(){
    const unlimited = state.timerRemaining === 0;
    els.timerRing.classList.toggle('hidden', unlimited);
  }

  /* ---------------- Turn / timer flow ---------------- */
  function updateActivePlayerHUD(){
    els.hudP1.classList.toggle('active-turn', state.current === 'X');
    els.hudP2.classList.toggle('active-turn', state.current === 'O');
  }

  function restartTimer(){
    clearTimerHandle();
    if(TTT.Settings.getTimerSeconds() === 0){ return; } // unlimited
    state.timerRemaining = TTT.Settings.getTimerSeconds();
    renderTimer();
    state.timerHandle = setInterval(() => {
      state.timerRemaining -= 1;
      renderTimer();
      if(state.timerRemaining <= 0){
        clearTimerHandle();
        handleTimeout();
      }
    }, 1000);
  }

  function clearTimerHandle(){
    if(state && state.timerHandle){ clearInterval(state.timerHandle); state.timerHandle = null; }
  }

  function renderTimer(){
    const total = TTT.Settings.getTimerSeconds() || 1;
    const circumference = 213; // 2*PI*34, matches stroke-dasharray in CSS
    const ratio = Math.max(0, state.timerRemaining / total);
    els.timerFg.style.strokeDashoffset = circumference * (1 - ratio);
    els.timerFg.classList.toggle('warning', state.timerRemaining <= 5);
    els.timerText.textContent = state.timerRemaining;
    if(state.timerRemaining <= 5 && state.timerRemaining > 0) TTT.Settings.Sound.tick();
  }

  function handleTimeout(){
    if(state.gameOver) return;
    TTT.UI.toast('⏱️ Waktu habis — giliran berpindah');
    switchTurn();
  }

  function switchTurn(){
    state.current = state.current === 'X' ? 'O' : 'X';
    updateActivePlayerHUD();
    restartTimer();
    if(state.isBot && state.current === 'O' && !state.gameOver){
      window.setTimeout(botMove, 480);
    }
  }

  /* ---------------- Moves ---------------- */
  function onCellClick(idx, cellEl){
    if(state.gameOver) return;
    if(state.board[idx] !== null) return;
    if(state.isBot && state.current === 'O') return; // not player's turn

    placeSymbol(idx, cellEl);
  }

  function placeSymbol(idx, cellEl){
    const symbol = state.current;
    state.board[idx] = symbol;
    state.moves.push({ idx, symbol });

    if(!cellEl) cellEl = els.board.querySelector(`[data-idx="${idx}"]`);
    renderSymbolInCell(cellEl, symbol, true);
    TTT.Settings.Sound.place();

    const result = TTT.Board.checkWinner(state.board, state.size, state.winLen);
    if(result.winner){
      endMatch(result.winner, result.line);
      return;
    }
    if(result.isDraw){
      endMatch(null, null);
      return;
    }
    switchTurn();
  }

  function renderSymbolInCell(cellEl, symbol, animate){
    if(!cellEl) return;
    cellEl.classList.add('taken');
    const span = document.createElement('span');
    span.className = 'symbol ' + (symbol === 'X' ? 'symbol-x' : 'symbol-o');
    span.textContent = symbol;
    cellEl.appendChild(span);

    if(animate && window.gsap){
      gsap.fromTo(span, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
      spawnParticleBurst(cellEl, symbol);
    }
  }

  function spawnParticleBurst(cellEl, symbol){
    const burst = document.createElement('div');
    burst.className = 'particle-burst';
    cellEl.appendChild(burst);
    const color = symbol === 'X' ? '#22D3EE' : '#A855F7';
    const count = 8;
    for(let i = 0; i < count; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.background = color;
      burst.appendChild(p);
      const angle = (Math.PI * 2 * i) / count;
      const dist = 28 + Math.random() * 14;
      if(window.gsap){
        gsap.fromTo(p, { x: 0, y: 0, opacity: 1, scale: 1 }, {
          x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
          opacity: 0, scale: 0.3, duration: 0.6, ease: 'power2.out'
        });
      }
    }
    window.setTimeout(() => burst.remove(), 700);
  }

  function botMove(){
    if(state.gameOver) return;
    const idx = TTT.AI.getBotMove(state.board, state.size, state.winLen, state.mode, 'O', 'X');
    if(idx === -1) return;
    placeSymbol(idx, null);
  }

  /* ---------------- End of match ---------------- */
  function endMatch(winnerSymbol, winLine){
    state.gameOver = true;
    clearTimerHandle();

    const durationSeconds = (Date.now() - state.startedAt) / 1000;
    const playerIsX = true; // human is always X
    let outcome;
    if(winnerSymbol === null) outcome = 'draw';
    else outcome = (winnerSymbol === 'X') ? 'win' : 'lose';

    const multiplier = state.luckyGalaxy && outcome === 'win' ? 2 : 1;
    let newStreak = state.preStreak;
    for(let i = 0; i < multiplier; i++){
      newStreak = TTT.Stats.recordMatch({
        outcome, durationSeconds: i === 0 ? durationSeconds : 0,
        size: state.size, mode: state.mode
      });
    }

    if(winLine){
      winLine.forEach(i => {
        const cell = els.board.querySelector(`[data-idx="${i}"]`);
        if(cell) cell.classList.add('win-cell');
      });
    }

    if(outcome === 'win') TTT.Settings.Sound.victory();
    else if(outcome === 'lose') TTT.Settings.Sound.defeat();
    else TTT.Settings.Sound.draw();

    if(outcome === 'win' && newStreak === 3){
      TTT.UI.toast('🔥 WIN STREAK! 3x kemenangan beruntun!');
    }

    showResultModal({ outcome, winnerSymbol, durationSeconds, moveCount: state.moves.length });
  }

  function showResultModal({ outcome, winnerSymbol, durationSeconds, moveCount }){
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.round(durationSeconds % 60);
    els.resultDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    els.resultMoves.textContent = moveCount;

    if(outcome === 'draw'){
      els.resultIcon.textContent = '🤝';
      els.resultTitle.textContent = 'Seri!';
      els.resultName.textContent = 'Tidak ada pemenang';
    } else if(outcome === 'win'){
      els.resultIcon.textContent = '🏆';
      els.resultTitle.textContent = 'Pemenang!';
      els.resultName.textContent = state.names[winnerSymbol];
    } else {
      els.resultIcon.textContent = '💥';
      els.resultTitle.textContent = 'Kalah!';
      els.resultName.textContent = state.names[winnerSymbol];
    }

    els.modalResult.classList.add('active');
    if(window.gsap){
      gsap.fromTo('.modal-card', { scale: 0.8, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' });
    }
    if(outcome === 'win') spawnConfetti();
  }

  function hideResultModal(){
    els.modalResult.classList.remove('active');
    els.modalConfetti.innerHTML = '';
  }

  function spawnConfetti(){
    const colors = ['#8B5CF6', '#A855F7', '#22D3EE', '#F8FAFC'];
    const container = els.modalConfetti;
    container.innerHTML = '';
    for(let i = 0; i < 40; i++){
      const piece = document.createElement('div');
      const size = 5 + Math.random() * 5;
      piece.style.position = 'absolute';
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.top = '-10px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
      if(window.gsap){
        gsap.to(piece, {
          y: 260 + Math.random() * 120,
          x: (Math.random() - 0.5) * 120,
          rotation: Math.random() * 360,
          opacity: 0,
          duration: 1.4 + Math.random() * 0.8,
          ease: 'power1.in',
          delay: Math.random() * 0.3
        });
      }
    }
  }

  /* ---------------- Restart / Quit ---------------- */
  function restart(){
    hideResultModal();
    start({ mode: state.mode, size: state.size, playerName: state.names.X });
  }

  function quit(){
    clearTimerHandle();
    hideResultModal();
  }

  /* ---------------- Replay ---------------- */
  function openReplay(){
    if(!state) return;
    hideResultModal();
    els.modalReplay.classList.add('active');
    const replayBoardArr = TTT.Board.createEmptyBoard(state.size);

    els.replayBoard.innerHTML = '';
    els.replayBoard.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    els.replayBoard.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;
    const fontScale = state.size === 3 ? '2em' : (state.size === 5 ? '1.3em' : '0.9em');
    const cells = [];
    for(let i = 0; i < state.size * state.size; i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.fontSize = fontScale;
      els.replayBoard.appendChild(cell);
      cells.push(cell);
    }

    let i = 0;
    function step(){
      if(i >= state.moves.length){
        els.replayMoveLabel.textContent = 'Selesai';
        return;
      }
      const move = state.moves[i];
      renderSymbolInCell(cells[move.idx], move.symbol, true);
      els.replayMoveLabel.textContent = `Move ${i + 1}`;
      i += 1;
      window.setTimeout(step, 650);
    }
    step();
  }

  function closeReplay(){
    els.modalReplay.classList.remove('active');
  }

  return { start, restart, quit, openReplay, closeReplay, hideResultModal };
})();
