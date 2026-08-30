(function initCloudTetrisGame(root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CloudTetrisGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCloudTetrisGame(root) {
  "use strict";

  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const LINE_SCORES = Object.freeze([0, 120, 360, 620, 1_000]);

  const PIECES = Object.freeze({
    I: Object.freeze({
      label: "蓝莓长条",
      color: "#65d9ff",
      matrix: Object.freeze([[1, 1, 1, 1]]),
    }),
    J: Object.freeze({
      label: "葡萄拐角",
      color: "#7e8cff",
      matrix: Object.freeze([[1, 0, 0], [1, 1, 1]]),
    }),
    L: Object.freeze({
      label: "焦糖拐角",
      color: "#ffab55",
      matrix: Object.freeze([[0, 0, 1], [1, 1, 1]]),
    }),
    O: Object.freeze({
      label: "柠檬方糖",
      color: "#ffe267",
      matrix: Object.freeze([[1, 1], [1, 1]]),
    }),
    S: Object.freeze({
      label: "薄荷曲奇",
      color: "#5ce0ad",
      matrix: Object.freeze([[0, 1, 1], [1, 1, 0]]),
    }),
    T: Object.freeze({
      label: "草莓皇冠",
      color: "#ff6f9f",
      matrix: Object.freeze([[0, 1, 0], [1, 1, 1]]),
    }),
    Z: Object.freeze({
      label: "樱桃闪电",
      color: "#ff6b67",
      matrix: Object.freeze([[1, 1, 0], [0, 1, 1]]),
    }),
  });

  const PIECE_TYPES = Object.freeze(Object.keys(PIECES));

  function createBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    if (!Number.isInteger(width) || width < 4 || !Number.isInteger(height) || height < 8) {
      throw new Error("落块棋盘尺寸无效");
    }
    return Array.from({ length: height }, () => Array(width).fill(null));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function assertBoard(board, width, height) {
    if (!Array.isArray(board) || board.length !== height || board.some((row) => !Array.isArray(row) || row.length !== width)) {
      throw new Error("落块棋盘数据无效");
    }
  }

  function rotateMatrix(matrix, direction = 1) {
    if (!Array.isArray(matrix) || matrix.length === 0 || matrix.some((row) => !Array.isArray(row) || row.length === 0)) {
      throw new Error("落块形状无效");
    }
    const height = matrix.length;
    const width = matrix[0].length;
    if (matrix.some((row) => row.length !== width)) throw new Error("落块形状必须是矩形");

    const clockwise = direction >= 0;
    const rotated = Array.from({ length: width }, () => Array(height).fill(0));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (clockwise) rotated[x][height - y - 1] = matrix[y][x];
        else rotated[width - x - 1][y] = matrix[y][x];
      }
    }
    return rotated;
  }

  function makePiece(type, boardWidth = BOARD_WIDTH) {
    const definition = PIECES[type];
    if (!definition) throw new Error(`未知落块类型：${type}`);
    const matrix = cloneMatrix(definition.matrix);
    return {
      type,
      matrix,
      x: Math.floor((boardWidth - matrix[0].length) / 2),
      y: 0,
    };
  }

  function canPlace(board, piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    const boardHeight = board.length;
    const boardWidth = board[0].length;
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;
        if (boardX < 0 || boardX >= boardWidth || boardY >= boardHeight) return false;
        if (boardY >= 0 && board[boardY][boardX]) return false;
      }
    }
    return true;
  }

  function mergePiece(board, piece) {
    if (!canPlace(board, piece)) throw new Error("落块无法固定在当前位置");
    const nextBoard = cloneBoard(board);
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) continue;
        const boardY = piece.y + y;
        if (boardY < 0) throw new Error("落块超出棋盘顶部");
        nextBoard[boardY][piece.x + x] = piece.type;
      }
    }
    return nextBoard;
  }

  function clearLines(board) {
    const width = board[0].length;
    const keptRows = board.filter((row) => row.some((cell) => !cell)).map((row) => row.slice());
    const lines = board.length - keptRows.length;
    const emptyRows = Array.from({ length: lines }, () => Array(width).fill(null));
    return { board: emptyRows.concat(keptRows), lines };
  }

  function getLineScore(lines, level = 1) {
    if (!Number.isInteger(lines) || lines < 0 || lines > 4) throw new Error("单次消行数无效");
    return LINE_SCORES[lines] * Math.max(1, level);
  }

  function getReward(score, lines) {
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    const safeLines = Math.max(0, Math.floor(Number(lines) || 0));
    if (safeScore === 0 && safeLines === 0) return 0;
    return Math.floor(safeScore / 8) + safeLines * 16;
  }

  function shuffledBag(random) {
    const bag = PIECE_TYPES.slice();
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const randomValue = Number(random());
      const safeValue = Number.isFinite(randomValue) ? Math.min(0.999999, Math.max(0, randomValue)) : 0;
      const swapIndex = Math.floor(safeValue * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
  }

  function drawPieceType(session) {
    if (session.sequenceIndex < session.pieceSequence.length) {
      const type = session.pieceSequence[session.sequenceIndex];
      session.sequenceIndex += 1;
      if (!PIECES[type]) throw new Error(`预设落块类型无效：${type}`);
      return type;
    }
    if (session.bag.length === 0) session.bag = shuffledBag(session.random);
    return session.bag.pop();
  }

  function createSession(options = {}) {
    const width = options.width === undefined ? BOARD_WIDTH : options.width;
    const height = options.height === undefined ? BOARD_HEIGHT : options.height;
    const random = options.random === undefined ? Math.random : options.random;
    if (typeof random !== "function") throw new Error("random 必须是函数");

    const board = options.board === undefined ? createBoard(width, height) : cloneBoard(options.board);
    assertBoard(board, width, height);
    const pieceSequence = options.pieceSequence === undefined ? [] : options.pieceSequence.slice();
    if (!Array.isArray(pieceSequence)) throw new Error("预设落块序列无效");

    const session = {
      width,
      height,
      random,
      pieceSequence,
      sequenceIndex: 0,
      bag: [],
      board,
      current: null,
      next: null,
      score: 0,
      lines: 0,
      level: 1,
      pieces: 0,
      gameOver: false,
    };
    session.current = makePiece(drawPieceType(session), width);
    session.next = makePiece(drawPieceType(session), width);
    session.gameOver = !canPlace(session.board, session.current);
    return session;
  }

  function spawnNextPiece(session) {
    session.current = makePiece(session.next.type, session.width);
    session.next = makePiece(drawPieceType(session), session.width);
    session.gameOver = !canPlace(session.board, session.current);
  }

  function settleCurrentPiece(session) {
    session.board = mergePiece(session.board, session.current);
    const cleared = clearLines(session.board);
    session.board = cleared.board;
    session.score += getLineScore(cleared.lines, session.level);
    session.lines += cleared.lines;
    session.level = 1 + Math.floor(session.lines / 8);
    session.pieces += 1;
    spawnNextPiece(session);
    return cleared.lines;
  }

  function stepSession(session) {
    if (session.gameOver) return { moved: false, locked: false, lines: 0, gameOver: true };
    if (canPlace(session.board, session.current, 0, 1)) {
      session.current.y += 1;
      return { moved: true, locked: false, lines: 0, gameOver: false };
    }
    const lines = settleCurrentPiece(session);
    return { moved: false, locked: true, lines, gameOver: session.gameOver };
  }

  function hardDropSession(session) {
    if (session.gameOver) return { distance: 0, lines: 0, gameOver: true };
    let distance = 0;
    while (canPlace(session.board, session.current, 0, 1)) {
      session.current.y += 1;
      distance += 1;
    }
    session.score += distance * 2;
    const lines = settleCurrentPiece(session);
    return { distance, lines, gameOver: session.gameOver };
  }

  function getFallInterval(level) {
    return Math.max(115, 720 - (Math.max(1, level) - 1) * 70);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  function drawBlock(context, x, y, size, type, alpha = 1) {
    const definition = PIECES[type];
    if (!definition) return;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = definition.color;
    roundedRect(context, x + 1.5, y + 1.5, size - 3, size - 3, Math.max(2, size * 0.14));
    context.fill();
    context.fillStyle = "rgba(255,255,255,.42)";
    roundedRect(context, x + size * 0.17, y + size * 0.16, size * 0.56, Math.max(2, size * 0.1), size * 0.05);
    context.fill();
    context.strokeStyle = "rgba(32,28,67,.38)";
    context.lineWidth = Math.max(1, size * 0.065);
    roundedRect(context, x + 1.5, y + 1.5, size - 3, size - 3, Math.max(2, size * 0.14));
    context.stroke();
    context.restore();
  }

  function drawPiece(context, piece, originX, originY, cellSize, alpha = 1) {
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x] || piece.y + y < 0) continue;
        drawBlock(context, originX + (piece.x + x) * cellSize, originY + (piece.y + y) * cellSize, cellSize, piece.type, alpha);
      }
    }
  }

  function getGhostPiece(session) {
    const ghost = { ...session.current, matrix: cloneMatrix(session.current.matrix) };
    while (canPlace(session.board, ghost, 0, 1)) ghost.y += 1;
    return ghost;
  }

  function drawPreview(context, piece, x, y, width, height) {
    const cellSize = Math.min(22, width / 5, height / 4);
    const pieceWidth = piece.matrix[0].length * cellSize;
    const pieceHeight = piece.matrix.length * cellSize;
    const originX = x + (width - pieceWidth) / 2;
    const originY = y + (height - pieceHeight) / 2;
    for (let row = 0; row < piece.matrix.length; row += 1) {
      for (let column = 0; column < piece.matrix[row].length; column += 1) {
        if (piece.matrix[row][column]) {
          drawBlock(context, originX + column * cellSize, originY + row * cellSize, cellSize, piece.type);
        }
      }
    }
  }

  function renderGame(context, session, view) {
    const { width, height, running } = view;
    context.clearRect(0, 0, width, height);

    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#28244e");
    sky.addColorStop(1, "#17152f");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    context.globalAlpha = 0.18;
    context.fillStyle = "#fff4cf";
    for (let index = 0; index < 34; index += 1) {
      const starX = (index * 83 + 29) % Math.max(1, width);
      const starY = (index * 47 + 17) % Math.max(1, height);
      context.fillRect(starX, starY, index % 3 === 0 ? 3 : 2, index % 3 === 0 ? 3 : 2);
    }
    context.globalAlpha = 1;

    const compact = width < 470;
    const margin = compact ? 12 : 20;
    const topStrip = compact ? 104 : 0;
    const sideWidth = compact ? 0 : Math.min(148, width * 0.29);
    const boardAvailableWidth = compact ? width - margin * 2 : width - margin * 3 - sideWidth;
    const boardAvailableHeight = height - margin * 2 - topStrip;
    const cellSize = Math.max(8, Math.floor(Math.min(boardAvailableWidth / session.width, boardAvailableHeight / session.height)));
    const boardWidth = cellSize * session.width;
    const boardHeight = cellSize * session.height;
    const originX = compact ? (width - boardWidth) / 2 : margin;
    const originY = compact ? topStrip + (height - topStrip - boardHeight) / 2 : (height - boardHeight) / 2;

    context.fillStyle = "rgba(9, 8, 27, .72)";
    roundedRect(context, originX - 6, originY - 6, boardWidth + 12, boardHeight + 12, 12);
    context.fill();
    context.strokeStyle = "rgba(255, 226, 103, .58)";
    context.lineWidth = 2;
    context.stroke();

    context.strokeStyle = "rgba(255,255,255,.055)";
    context.lineWidth = 1;
    for (let x = 1; x < session.width; x += 1) {
      context.beginPath();
      context.moveTo(originX + x * cellSize, originY);
      context.lineTo(originX + x * cellSize, originY + boardHeight);
      context.stroke();
    }
    for (let y = 1; y < session.height; y += 1) {
      context.beginPath();
      context.moveTo(originX, originY + y * cellSize);
      context.lineTo(originX + boardWidth, originY + y * cellSize);
      context.stroke();
    }

    for (let y = 0; y < session.height; y += 1) {
      for (let x = 0; x < session.width; x += 1) {
        if (session.board[y][x]) drawBlock(context, originX + x * cellSize, originY + y * cellSize, cellSize, session.board[y][x]);
      }
    }
    if (!session.gameOver) {
      drawPiece(context, getGhostPiece(session), originX, originY, cellSize, 0.19);
      drawPiece(context, session.current, originX, originY, cellSize);
    }

    context.fillStyle = "#fff7df";
    context.textBaseline = "top";
    if (compact) {
      context.font = "700 14px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillText("云朵叠叠乐", margin, 12);
      context.font = "800 22px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillStyle = "#ffe267";
      context.fillText("无限时", margin, 34);
      context.fillStyle = "#fff7df";
      context.font = "700 13px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillText(`分数 ${session.score}`, margin + 77, 38);
      context.fillText(`消行 ${session.lines}`, margin + 77, 61);
      context.fillStyle = "rgba(255,255,255,.64)";
      context.font = "600 11px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillText("下一个", width - 96, 12);
      drawPreview(context, session.next, width - 105, 27, 90, 65);
    } else {
      const panelX = originX + boardWidth + margin;
      const panelY = originY;
      const panelHeight = Math.min(boardHeight, 340);
      context.fillStyle = "rgba(255, 247, 223, .09)";
      roundedRect(context, panelX, panelY, sideWidth, panelHeight, 16);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.16)";
      context.stroke();
      context.fillStyle = "#fff7df";
      context.font = "700 16px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillText("云朵叠叠乐", panelX + 14, panelY + 16);
      context.font = "600 11px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillStyle = "rgba(255,255,255,.63)";
      context.fillText("无限营业", panelX + 14, panelY + 50);
      context.font = "800 19px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillStyle = "#ffe267";
      context.fillText("堆满才结算", panelX + 14, panelY + 69);
      context.font = "700 13px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillStyle = "#fff7df";
      context.fillText(`分数  ${session.score}`, panelX + 14, panelY + 112);
      context.fillText(`消行  ${session.lines}`, panelX + 14, panelY + 137);
      context.fillText(`等级  ${session.level}`, panelX + 14, panelY + 162);
      context.fillStyle = "rgba(255,255,255,.63)";
      context.font = "600 11px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillText("下一个甜品", panelX + 14, panelY + 197);
      drawPreview(context, session.next, panelX + 10, panelY + 215, sideWidth - 20, 92);
    }

    if (!running || session.gameOver) {
      context.fillStyle = "rgba(10, 8, 28, .72)";
      roundedRect(context, originX + 14, originY + boardHeight / 2 - 52, boardWidth - 28, 104, 16);
      context.fill();
      context.textAlign = "center";
      context.fillStyle = "#fff7df";
      context.font = `800 ${Math.max(16, Math.min(23, boardWidth / 12))}px ui-rounded, 'Hiragino Sans GB', sans-serif`;
      const title = session.gameOver ? "柜台堆满啦" : session.score > 0 ? "本班已结算" : "准备开始营业";
      context.fillText(title, originX + boardWidth / 2, originY + boardHeight / 2 - 25);
      context.font = "600 12px ui-rounded, 'Hiragino Sans GB', sans-serif";
      context.fillStyle = "rgba(255,255,255,.7)";
      context.fillText(session.score > 0 ? `预计获得 ${getReward(session.score, session.lines)} 云朵币` : "用方向键移动，空格快速落下", originX + boardWidth / 2, originY + boardHeight / 2 + 13);
      context.textAlign = "start";
    }
  }

  function mount(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== "function") throw new Error("需要一个可用的 canvas 元素");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建 2D 画布");
    const onScore = typeof options.onScore === "function" ? options.onScore : function noop() {};
    const onFinish = typeof options.onFinish === "function" ? options.onFinish : function noop() {};
    let session = createSession({ random: options.random });
    let running = false;
    let destroyed = false;
    let frameId = null;
    let lastDropTime = 0;
    let lastReportedScore = -1;
    let lastReportedLines = -1;
    let lastReportedLevel = -1;

    const timing = typeof performance !== "undefined" && typeof performance.now === "function"
      ? () => performance.now()
      : () => Date.now();
    const requestFrame = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame.bind(root)
      : (callback) => setTimeout(() => callback(timing()), 16);
    const cancelFrame = typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame.bind(root)
      : clearTimeout;

    function sizeCanvas() {
      const bounds = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
      const cssWidth = Math.max(280, Math.round((bounds && bounds.width) || canvas.clientWidth || canvas.width || 520));
      const cssHeight = Math.max(520, Math.round((bounds && bounds.height) || canvas.clientHeight || canvas.height || 640));
      const pixelRatio = Math.min(2, Math.max(1, (root && root.devicePixelRatio) || 1));
      if (canvas.width !== Math.round(cssWidth * pixelRatio) || canvas.height !== Math.round(cssHeight * pixelRatio)) {
        canvas.width = Math.round(cssWidth * pixelRatio);
        canvas.height = Math.round(cssHeight * pixelRatio);
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = false;
      return { width: cssWidth, height: cssHeight };
    }

    function render() {
      const size = sizeCanvas();
      renderGame(context, session, { ...size, running });
    }

    function reportScore(force = false) {
      if (!force
        && session.score === lastReportedScore
        && session.lines === lastReportedLines
        && session.level === lastReportedLevel) return;
      lastReportedScore = session.score;
      lastReportedLines = session.lines;
      lastReportedLevel = session.level;
      onScore({
        score: session.score,
        lines: session.lines,
        level: session.level,
        reward: getReward(session.score, session.lines),
      });
    }

    function finish(reason) {
      if (!running) return;
      running = false;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      reportScore(true);
      render();
      onFinish({
        score: session.score,
        lines: session.lines,
        level: session.level,
        pieces: session.pieces,
        reward: getReward(session.score, session.lines),
        reason,
      });
    }

    function settleIfNeeded(result) {
      reportScore(true);
      if (result.gameOver) finish("game-over");
      else render();
    }

    function tick(now) {
      if (!running || destroyed) return;
      let steps = 0;
      const interval = getFallInterval(session.level);
      lastDropTime = Math.max(lastDropTime, now - interval * 5);
      while (now - lastDropTime >= interval && steps < 5 && running) {
        lastDropTime += interval;
        const result = stepSession(session);
        steps += 1;
        if (result.locked) reportScore(true);
        if (result.gameOver) {
          finish("game-over");
          return;
        }
      }
      reportScore();
      render();
      frameId = requestFrame(tick);
    }

    function start() {
      if (destroyed) throw new Error("这个落块游戏实例已经销毁");
      if (running) return;
      session = createSession({ random: options.random });
      lastReportedScore = -1;
      lastReportedLines = -1;
      lastReportedLevel = -1;
      lastDropTime = timing();
      running = true;
      reportScore(true);
      render();
      frameId = requestFrame(tick);
    }

    function stop() {
      finish("stopped");
    }

    function move(direction) {
      if (!running || session.gameOver) return false;
      const delta = direction === "left" ? -1 : direction === "right" ? 1 : Number(direction);
      if (delta !== -1 && delta !== 1) throw new Error("移动方向只能是 left、right、-1 或 1");
      if (!canPlace(session.board, session.current, delta, 0)) return false;
      session.current.x += delta;
      render();
      return true;
    }

    function rotate(direction = 1) {
      if (!running || session.gameOver) return false;
      const rotated = rotateMatrix(session.current.matrix, direction);
      const wallKicks = [0, -1, 1, -2, 2];
      for (const offset of wallKicks) {
        if (canPlace(session.board, session.current, offset, 0, rotated)) {
          session.current.matrix = rotated;
          session.current.x += offset;
          render();
          return true;
        }
      }
      return false;
    }

    function softDrop() {
      if (!running || session.gameOver) return false;
      if (canPlace(session.board, session.current, 0, 1)) {
        session.current.y += 1;
        session.score += 1;
        reportScore(true);
        render();
        return true;
      }
      settleIfNeeded(stepSession(session));
      return false;
    }

    function drop() {
      if (!running || session.gameOver) return false;
      const result = hardDropSession(session);
      settleIfNeeded(result);
      return true;
    }

    function onKeyDown(event) {
      if (!running || event.defaultPrevented) return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
      let handled = true;
      if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowDown") softDrop();
      else if (event.key === "ArrowUp" || event.key.toLowerCase() === "x") rotate(1);
      else if (event.key.toLowerCase() === "z") rotate(-1);
      else if (event.key === " " || event.key === "Spacebar") drop();
      else handled = false;
      if (handled) event.preventDefault();
    }

    function onResize() {
      if (!destroyed) render();
    }

    function destroy() {
      if (destroyed) return;
      running = false;
      destroyed = true;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      if (root && typeof root.removeEventListener === "function") {
        root.removeEventListener("keydown", onKeyDown);
        root.removeEventListener("resize", onResize);
      }
    }

    if (root && typeof root.addEventListener === "function") {
      root.addEventListener("keydown", onKeyDown, { passive: false });
      root.addEventListener("resize", onResize);
    }
    render();

    return { start, stop, destroy, move, rotate, drop };
  }

  return Object.freeze({
    BOARD_WIDTH,
    BOARD_HEIGHT,
    LINE_SCORES,
    PIECES,
    createBoard,
    rotateMatrix,
    makePiece,
    canPlace,
    mergePiece,
    clearLines,
    getLineScore,
    getReward,
    createSession,
    stepSession,
    hardDropSession,
    mount,
  });
});
