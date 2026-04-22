// Telegram Mini App init
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

const SYMBOLS = { X: "✕", O: "○" };

let board = Array(9).fill(null);
let currentPlayer = "X";
let gameOver = false;
let mode = "pvp"; // "pvp" | "pvc"
let score = { X: 0, O: 0, draw: 0 };

const cells = document.querySelectorAll(".cell");
const statusEl = document.getElementById("status");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreDraw = document.getElementById("score-draw");
const restartBtn = document.getElementById("restart-btn");
const modeBtns = document.querySelectorAll(".mode-btn");

function render() {
  cells.forEach((cell, i) => {
    const val = board[i];
    cell.textContent = val ? SYMBOLS[val] : "";
    cell.className = "cell" + (val ? ` ${val.toLowerCase()}` : "");
    cell.disabled = !!val || gameOver;
  });
}

function setStatus(msg, isWinner = false) {
  statusEl.textContent = msg;
  statusEl.className = isWinner ? "winner" : "";
}

function checkWinner(b) {
  for (const [a, c, d] of WINNING_LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: [a, c, d] };
  }
  if (b.every(Boolean)) return { winner: null, line: null, draw: true };
  return null;
}

function highlightWinningLine(line) {
  line.forEach(i => cells[i].classList.add("winning"));
}

function handleResult(result) {
  gameOver = true;
  cells.forEach(c => (c.disabled = true));

  if (result.draw) {
    score.draw++;
    setStatus("It's a draw!");
    tg?.HapticFeedback?.notificationOccurred("warning");
  } else {
    score[result.winner]++;
    highlightWinningLine(result.line);
    const label = mode === "pvc" && result.winner === "O" ? "Bot wins!" : `Player ${result.winner} wins!`;
    setStatus(label, true);
    tg?.HapticFeedback?.notificationOccurred("success");
  }

  updateScore();
}

function updateScore() {
  scoreX.textContent = `X: ${score.X}`;
  scoreO.textContent = `O: ${score.O}`;
  scoreDraw.textContent = `Draw: ${score.draw}`;
}

function botMove() {
  const move = getBotMove(board);
  if (move === -1) return;
  board[move] = "O";
  render();
  const result = checkWinner(board);
  if (result) { handleResult(result); return; }
  currentPlayer = "X";
  setStatus("Your turn (X)");
}

function getBotMove(b) {
  // Try to win, then block, then center, then random
  for (const player of ["O", "X"]) {
    for (const [a, c, d] of WINNING_LINES) {
      const line = [a, c, d];
      const vals = line.map(i => b[i]);
      if (vals.filter(v => v === player).length === 2 && vals.includes(null)) {
        return line[vals.indexOf(null)];
      }
    }
  }
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter(i => !b[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  const empty = b.map((v, i) => (!v ? i : -1)).filter(i => i !== -1);
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

function handleCellClick(index) {
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  tg?.HapticFeedback?.impactOccurred("light");
  render();

  const result = checkWinner(board);
  if (result) { handleResult(result); return; }

  if (mode === "pvp") {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    setStatus(`Player ${currentPlayer}'s turn`);
  } else {
    currentPlayer = "O";
    setStatus("Bot is thinking…");
    setTimeout(botMove, 300);
  }
}

function restart() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  gameOver = false;
  render();
  setStatus(mode === "pvc" ? "Your turn (X)" : "Player X's turn");
}

cells.forEach(cell => {
  cell.addEventListener("click", () => handleCellClick(Number(cell.dataset.index)));
});

restartBtn.addEventListener("click", restart);

modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.toggle("active", b === btn));
    score = { X: 0, O: 0, draw: 0 };
    updateScore();
    restart();
  });
});

// Boot
restart();
