const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#51f6ff",
  J: "#6a8bff",
  L: "#ffb44d",
  O: "#ffe66a",
  S: "#63f07d",
  T: "#cf7bff",
  Z: "#ff6b7a",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const overlay = document.getElementById("overlay");
const overlayLabel = document.getElementById("overlayLabel");
const touchButtons = document.querySelectorAll("[data-action]");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
      // Service worker registration failure should not block the game.
    });
  });
}

let board;
let piece;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let lastTime;
let gameOver;
let animationId;
let touchStartX = 0;
let touchStartY = 0;
let touchLastX = 0;
let touchMoved = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomType() {
  const types = Object.keys(SHAPES);
  return types[Math.floor(Math.random() * types.length)];
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function createPiece(type = randomType()) {
  return {
    type,
    matrix: cloneMatrix(SHAPES[type]),
    x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2),
    y: 0,
  };
}

function resetGame() {
  board = createBoard();
  piece = createPiece();
  nextPiece = createPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  lastTime = performance.now();
  gameOver = false;
  overlay.classList.add("hidden");
  updateStats();
  draw();
  startLoop();
}

function startLoop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  animationId = requestAnimationFrame(update);
}

function getDropInterval() {
  return Math.max(120, 900 - (level - 1) * 80);
}

function collide(targetBoard, targetPiece) {
  return targetPiece.matrix.some((row, y) =>
    row.some((value, x) => {
      if (!value) {
        return false;
      }
      const boardX = x + targetPiece.x;
      const boardY = y + targetPiece.y;
      return (
        boardX < 0 ||
        boardX >= COLS ||
        boardY >= ROWS ||
        (boardY >= 0 && targetBoard[boardY][boardX] !== null)
      );
    }),
  );
}

function merge() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = piece.y + y;
        if (boardY >= 0) {
          board[boardY][piece.x + x] = piece.type;
        }
      }
    });
  });
}

function rotateMatrix(matrix, direction) {
  const rotated = matrix[0].map((_, index) => matrix.map((row) => row[index]));
  return direction > 0 ? rotated.map((row) => row.reverse()) : rotated.reverse();
}

function rotatePiece(direction) {
  const original = piece.matrix;
  const rotated = rotateMatrix(piece.matrix, direction);
  const kicks = [0, -1, 1, -2, 2];

  for (const offset of kicks) {
    const trial = { ...piece, matrix: rotated, x: piece.x + offset };
    if (!collide(board, trial)) {
      piece.matrix = rotated;
      piece.x += offset;
      draw();
      return;
    }
  }

  piece.matrix = original;
}

function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (!cleared) {
    return;
  }

  const scoreTable = [0, 100, 300, 500, 800];
  score += scoreTable[cleared] * level;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  updateStats();
}

function spawnNextPiece() {
  piece = nextPiece;
  piece.x = Math.floor(COLS / 2) - Math.ceil(piece.matrix[0].length / 2);
  piece.y = 0;
  nextPiece = createPiece();

  if (collide(board, piece)) {
    gameOver = true;
    overlayLabel.textContent = "GAME OVER";
    overlay.classList.remove("hidden");
    cancelAnimationFrame(animationId);
  }
}

function drop() {
  piece.y += 1;
  if (collide(board, piece)) {
    piece.y -= 1;
    merge();
    clearLines();
    spawnNextPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(board, piece)) {
    piece.y += 1;
  }
  piece.y -= 1;
  merge();
  clearLines();
  spawnNextPiece();
  dropCounter = 0;
  draw();
}

function move(dir) {
  piece.x += dir;
  if (collide(board, piece)) {
    piece.x -= dir;
  } else {
    draw();
  }
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
  context.fillStyle = "rgba(255, 255, 255, 0.18)";
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.strokeStyle = "rgba(4, 17, 31, 0.55)";
  context.lineWidth = 2;
  context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawMatrix(context, matrix, offset, type, size) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(context, x + offset.x, y + offset.y, COLORS[type], size);
      }
    });
  });
}

function drawGhost() {
  const ghost = {
    ...piece,
    matrix: cloneMatrix(piece.matrix),
  };
  while (!collide(board, ghost)) {
    ghost.y += 1;
  }
  ghost.y -= 1;

  ctx.globalAlpha = 0.2;
  drawMatrix(ctx, ghost.matrix, { x: ghost.x, y: ghost.y }, piece.type, BLOCK);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ctx, x, y, COLORS[value], BLOCK);
      }
    });
  });
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const size = 24;
  const { matrix, type } = nextPiece;
  const offsetX = (nextCanvas.width / size - matrix[0].length) / 2;
  const offsetY = (nextCanvas.height / size - matrix.length) / 2;
  drawMatrix(nextCtx, matrix, { x: offsetX, y: offsetY }, type, size);
}

function draw() {
  drawBoard();
  drawGhost();
  drawMatrix(ctx, piece.matrix, { x: piece.x, y: piece.y }, piece.type, BLOCK);
  drawNext();
}

function update(time = 0) {
  if (gameOver) {
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > getDropInterval()) {
    drop();
  }

  draw();
  animationId = requestAnimationFrame(update);
}

function performAction(action) {
  if (gameOver) {
    return;
  }

  switch (action) {
    case "left":
      move(-1);
      break;
    case "right":
      move(1);
      break;
    case "down":
      drop();
      break;
    case "rotate-left":
      rotatePiece(-1);
      break;
    case "rotate-right":
      rotatePiece(1);
      break;
    case "hard-drop":
      hardDrop();
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  switch (event.code) {
    case "ArrowLeft":
      performAction("left");
      break;
    case "ArrowRight":
      performAction("right");
      break;
    case "ArrowDown":
      performAction("down");
      break;
    case "KeyZ":
      performAction("rotate-left");
      break;
    case "ArrowUp":
    case "KeyX":
      performAction("rotate-right");
      break;
    case "Space":
      event.preventDefault();
      performAction("hard-drop");
      break;
    default:
      break;
  }
});

touchButtons.forEach((button) => {
  const action = button.dataset.action;
  button.addEventListener("click", () => {
    performAction(action);
  });
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchLastX = touch.clientX;
  touchMoved = false;
}, { passive: true });

canvas.addEventListener("touchmove", (event) => {
  if (gameOver || !event.touches.length) {
    return;
  }

  const touch = event.touches[0];
  const diffX = touch.clientX - touchLastX;
  const totalY = touch.clientY - touchStartY;
  if (Math.abs(touch.clientX - touchStartX) >= 12 || Math.abs(totalY) >= 12) touchMoved = true;

  if (diffX >= 24) {
    performAction("right");
    touchLastX = touch.clientX;
  } else if (diffX <= -24) {
    performAction("left");
    touchLastX = touch.clientX;
  }

  if (totalY >= 36) {
    performAction("down");
    touchStartY = touch.clientY;
  }

  event.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  if (gameOver) {
    return;
  }

  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  const diffX = touch.clientX - touchStartX;
  const diffY = touch.clientY - touchStartY;
  const isTap = !touchMoved && Math.abs(diffX) < 12 && Math.abs(diffY) < 12;
  const isUpFlick = diffY <= -28 && Math.abs(diffX) < 24;

  if (isTap) {
    performAction("rotate-right");
  } else if (isUpFlick) {
    performAction("hard-drop");
  }
}, { passive: false });

// Older iOS Safari may ignore viewport zoom restrictions. Block its native gestures.
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);

resetGame();
