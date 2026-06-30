/* ===========================================================
   AI.JS — Bot Intelligence
   Provides move selection for Easy / Medium / Hard / Impossible bots.
   Impossible mode uses Minimax (depth-limited on large boards for speed).
=========================================================== */

window.TTT = window.TTT || {};

TTT.AI = (function(){

  /**
   * Returns a random empty cell index. Used as a fallback / Easy bot baseline.
   */
  function randomMove(emptyCells){
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  /**
   * Checks if placing `symbol` at `index` would immediately win the game.
   * Used by Medium/Hard/Impossible bots to find winning or blocking moves.
   */
  function findWinningMove(board, size, winLen, symbol){
    const empties = TTT.Board.getEmptyCells(board);
    for(const idx of empties){
      const clone = board.slice();
      clone[idx] = symbol;
      if(TTT.Board.checkWinner(clone, size, winLen).winner === symbol){
        return idx;
      }
    }
    return -1;
  }

  /**
   * Scores a move by how many "open lines" it contributes to (simple heuristic
   * for Medium/Hard difficulty on boards too large for full minimax).
   */
  function heuristicScore(board, size, winLen, idx, symbol){
    const clone = board.slice();
    clone[idx] = symbol;
    let score = 0;
    const lines = TTT.Board.getLinesThrough(size, winLen, idx);
    for(const line of lines){
      let mine = 0, blocked = false;
      for(const cellIdx of line){
        if(clone[cellIdx] === symbol) mine++;
        else if(clone[cellIdx] !== null) { blocked = true; break; }
      }
      if(!blocked) score += Math.pow(3, mine);
    }
    // Prefer center-ish cells slightly
    const center = (size - 1) / 2;
    const r = Math.floor(idx / size), c = idx % size;
    score += (3 - (Math.abs(r - center) + Math.abs(c - center))) * 0.5;
    return score;
  }

  /**
   * Minimax with alpha-beta pruning. Only used for small boards (3x3) where
   * the full search space is tractable; otherwise heuristic search is used.
   */
  function minimax(board, size, winLen, depth, isMaximizing, botSymbol, humanSymbol, alpha, beta){
    const result = TTT.Board.checkWinner(board, size, winLen);
    if(result.winner === botSymbol) return 10 - depth;
    if(result.winner === humanSymbol) return depth - 10;
    if(result.isDraw) return 0;

    const empties = TTT.Board.getEmptyCells(board);

    if(isMaximizing){
      let best = -Infinity;
      for(const idx of empties){
        board[idx] = botSymbol;
        const val = minimax(board, size, winLen, depth + 1, false, botSymbol, humanSymbol, alpha, beta);
        board[idx] = null;
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if(beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for(const idx of empties){
        board[idx] = humanSymbol;
        const val = minimax(board, size, winLen, depth + 1, true, botSymbol, humanSymbol, alpha, beta);
        board[idx] = null;
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if(beta <= alpha) break;
      }
      return best;
    }
  }

  function bestMinimaxMove(board, size, winLen, botSymbol, humanSymbol){
    let bestScore = -Infinity;
    let bestIdx = -1;
    const empties = TTT.Board.getEmptyCells(board);
    for(const idx of empties){
      board[idx] = botSymbol;
      const score = minimax(board, size, winLen, 0, false, botSymbol, humanSymbol, -Infinity, Infinity);
      board[idx] = null;
      if(score > bestScore){
        bestScore = score;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  function bestHeuristicMove(board, size, winLen, botSymbol, humanSymbol){
    // 1. Win if possible
    let idx = findWinningMove(board, size, winLen, botSymbol);
    if(idx !== -1) return idx;
    // 2. Block opponent's win
    idx = findWinningMove(board, size, winLen, humanSymbol);
    if(idx !== -1) return idx;
    // 3. Otherwise pick the highest-scoring open line move
    const empties = TTT.Board.getEmptyCells(board);
    let bestIdx = empties[0], bestScore = -Infinity;
    for(const cellIdx of empties){
      const score = heuristicScore(board, size, winLen, cellIdx, botSymbol);
      if(score > bestScore){
        bestScore = score;
        bestIdx = cellIdx;
      }
    }
    return bestIdx;
  }

  /**
   * Public entry point: returns the index the bot should play.
   * difficulty: 'easy' | 'medium' | 'hard' | 'impossible'
   */
  function getBotMove(board, size, winLen, difficulty, botSymbol, humanSymbol){
    const empties = TTT.Board.getEmptyCells(board);
    if(empties.length === 0) return -1;

    if(difficulty === 'easy'){
      // 80% random, 20% smart — bot frequently makes mistakes.
      if(Math.random() < 0.8) return randomMove(empties);
      return bestHeuristicMove(board, size, winLen, botSymbol, humanSymbol);
    }

    if(difficulty === 'medium'){
      // 35% random "mistake" chance, otherwise heuristic decision.
      if(Math.random() < 0.35) return randomMove(empties);
      return bestHeuristicMove(board, size, winLen, botSymbol, humanSymbol);
    }

    if(difficulty === 'hard'){
      // Mostly optimal heuristic play, rare slip.
      if(Math.random() < 0.08) return randomMove(empties);
      return bestHeuristicMove(board, size, winLen, botSymbol, humanSymbol);
    }

    if(difficulty === 'impossible'){
      // True minimax only feasible on 3x3; larger boards fall back to the
      // strong heuristic (full minimax there would be far too slow).
      if(size === 3){
        return bestMinimaxMove(board, size, winLen, botSymbol, humanSymbol);
      }
      return bestHeuristicMove(board, size, winLen, botSymbol, humanSymbol);
    }

    return randomMove(empties);
  }

  return { getBotMove };
})();
