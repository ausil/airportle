import { ANSWERS, VALID_GUESSES } from './airports.js';

const MAX_GUESSES = 6;
const WORD_LENGTH = 3;

// --- Daily puzzle selection ---
function getDayIndex() {
  const epoch = new Date(2026, 3, 2); // Apr 2 2026 — game #1
  const now = new Date();
  const msPerDay = 86400000;
  return Math.floor((now.setHours(0,0,0,0) - epoch.setHours(0,0,0,0)) / msPerDay);
}

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Shuffle using Fisher-Yates with a seeded RNG
function seededShuffle(arr, seed) {
  const copy = [...arr];
  const rng = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTodayAnswer() {
  const dayIndex = getDayIndex();
  // Each cycle of ANSWERS.length days uses a different shuffle
  const cycle = Math.floor(dayIndex / ANSWERS.length);
  const posInCycle = dayIndex % ANSWERS.length;
  const shuffled = seededShuffle(ANSWERS, cycle);
  return shuffled[posInCycle];
}

const todayAnswer = getTodayAnswer();
const answer = todayAnswer.code.toUpperCase();
const validSet = new Set(VALID_GUESSES.map(c => c.toUpperCase()));

// --- State ---
let currentRow = 0;
let currentCol = 0;
let currentGuess = '';
let gameOver = false;
let revealing = false;
let guesses = [];

// --- Build board ---
const board = document.getElementById('board');
for (let r = 0; r < MAX_GUESSES; r++) {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.row = r;
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.row = r;
    tile.dataset.col = c;
    row.appendChild(tile);
  }
  board.appendChild(row);
}

// --- Toast ---
function showToast(msg, duration = 1500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Tile helpers ---
function getTile(row, col) {
  return board.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function getRow(row) {
  return board.querySelector(`.row[data-row="${row}"]`);
}

// --- Input ---
function addLetter(letter) {
  if (gameOver || revealing || currentCol >= WORD_LENGTH) return;
  const tile = getTile(currentRow, currentCol);
  tile.textContent = letter;
  tile.classList.add('filled');
  currentGuess += letter;
  currentCol++;
}

function removeLetter() {
  if (gameOver || revealing || currentCol <= 0) return;
  currentCol--;
  const tile = getTile(currentRow, currentCol);
  tile.textContent = '';
  tile.classList.remove('filled');
  currentGuess = currentGuess.slice(0, -1);
}

function submitGuess() {
  if (gameOver || revealing) return;
  if (currentGuess.length < WORD_LENGTH) {
    shakeRow(currentRow);
    showToast('Not enough letters');
    return;
  }

  if (!validSet.has(currentGuess)) {
    shakeRow(currentRow);
    showToast('Not a valid airport code');
    return;
  }

  const result = evaluateGuess(currentGuess, answer);
  guesses.push({ guess: currentGuess, result });
  revealRow(currentRow, result);
}

function evaluateGuess(guess, target) {
  const result = ['absent', 'absent', 'absent'];
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const used = [false, false, false];

  // Green pass
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Yellow pass
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function shakeRow(row) {
  const rowEl = getRow(row);
  rowEl.classList.add('shake');
  setTimeout(() => rowEl.classList.remove('shake'), 400);
}

function revealRow(row, result) {
  revealing = true;
  const tiles = [];
  for (let c = 0; c < WORD_LENGTH; c++) {
    tiles.push(getTile(row, c));
  }

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip');
      // Apply color at midpoint of flip
      setTimeout(() => {
        tile.classList.add(result[i]);
      }, 250);
    }, i * 300);
  });

  // After all tiles revealed
  const revealTime = WORD_LENGTH * 300 + 500;
  setTimeout(() => {
    updateKeyboard(currentGuess, result);

    const won = result.every(r => r === 'correct');
    if (won) {
      gameOver = true;
      // Bounce animation
      tiles.forEach((tile, i) => {
        setTimeout(() => tile.classList.add('bounce'), i * 100);
      });
      setTimeout(() => {
        const messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        showToast(messages[currentRow] || 'Nice!');
        saveGameState(true);
        setTimeout(() => showResultModal(true), 1500);
      }, 400);
    } else if (currentRow >= MAX_GUESSES - 1) {
      gameOver = true;
      showToast(answer, 3000);
      saveGameState(false);
      setTimeout(() => showResultModal(false), 2000);
    }

    currentRow++;
    currentCol = 0;
    currentGuess = '';
    revealing = false;
  }, revealTime);
}

// --- Keyboard ---
function updateKeyboard(guess, result) {
  for (let i = 0; i < WORD_LENGTH; i++) {
    const key = guess[i];
    const btn = document.querySelector(`[data-key="${key}"]`);
    if (!btn) continue;

    const current = btn.classList.contains('correct') ? 'correct'
      : btn.classList.contains('present') ? 'present'
      : btn.classList.contains('absent') ? 'absent'
      : null;

    const priority = { correct: 3, present: 2, absent: 1 };
    const newState = result[i];

    if (!current || priority[newState] > (priority[current] || 0)) {
      btn.classList.remove('correct', 'present', 'absent');
      btn.classList.add(newState);
    }
  }
}

// --- Physical keyboard ---
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') {
    submitGuess();
  } else if (e.key === 'Backspace') {
    removeLetter();
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    addLetter(e.key.toUpperCase());
  }
});

// --- On-screen keyboard ---
document.getElementById('keyboard').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-key]');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'Enter') submitGuess();
  else if (key === 'Backspace') removeLetter();
  else addLetter(key);
});

// --- Modals ---
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

document.getElementById('help-btn').addEventListener('click', () => openModal('help-modal'));
document.getElementById('stats-btn').addEventListener('click', () => {
  updateStatsDisplay();
  openModal('stats-modal');
});

// --- Stats / persistence ---
function getStats() {
  try {
    return JSON.parse(localStorage.getItem('airportle-stats')) || defaultStats();
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] };
}

function saveStats(stats) {
  localStorage.setItem('airportle-stats', JSON.stringify(stats));
}

function saveGameState(won) {
  const stats = getStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.distribution[guesses.length - 1]++;
  } else {
    stats.streak = 0;
  }
  saveStats(stats);

  // Save today's game
  localStorage.setItem('airportle-day', JSON.stringify({
    dayIndex: getDayIndex(),
    guesses: guesses.map(g => ({ guess: g.guess, result: g.result })),
    won,
    answer
  }));
}

function loadGameState() {
  try {
    const saved = JSON.parse(localStorage.getItem('airportle-day'));
    if (!saved || saved.dayIndex !== getDayIndex()) return null;
    return saved;
  } catch {
    return null;
  }
}

function restoreGame(state) {
  gameOver = true;
  guesses = state.guesses;

  state.guesses.forEach((g, row) => {
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = getTile(row, c);
      tile.textContent = g.guess[c];
      tile.classList.add('filled', g.result[c]);
    }
    updateKeyboard(g.guess, g.result);
  });

  currentRow = state.guesses.length;
}

// --- Stats display ---
function updateStatsDisplay() {
  const stats = getStats();
  document.getElementById('stat-played').textContent = stats.played;
  document.getElementById('stat-win-pct').textContent = stats.played ? Math.round(stats.wins / stats.played * 100) : 0;
  document.getElementById('stat-streak').textContent = stats.streak;
  document.getElementById('stat-max-streak').textContent = stats.maxStreak;

  const distContainer = document.getElementById('guess-distribution');
  distContainer.innerHTML = '';
  const max = Math.max(...stats.distribution, 1);

  for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.className = 'dist-row';

    const num = document.createElement('span');
    num.className = 'dist-num';
    num.textContent = i + 1;

    const bar = document.createElement('div');
    bar.className = 'dist-bar';
    const pct = Math.max((stats.distribution[i] / max) * 100, 8);
    bar.style.width = pct + '%';
    bar.textContent = stats.distribution[i];

    // Highlight the winning row if game just ended
    const saved = loadGameState();
    if (saved && saved.won && saved.guesses.length === i + 1) {
      bar.classList.add('highlight');
    }

    row.appendChild(num);
    row.appendChild(bar);
    distContainer.appendChild(row);
  }

  // Show share section if game is over
  const shareSection = document.getElementById('share-section');
  if (gameOver) {
    shareSection.classList.remove('hidden');
    updateTimer();
  }
}

function updateTimer() {
  const timerEl = document.getElementById('next-puzzle-timer');
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diff = tomorrow - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  timerEl.textContent = `Next puzzle in ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

setInterval(updateTimer, 1000);

// --- Share ---
function generateShareText() {
  const dayNum = getDayIndex() + 1;
  const saved = loadGameState();
  const won = saved?.won;
  const numGuesses = won ? guesses.length : 'X';

  let text = `Airportle #${dayNum} ${numGuesses}/6\nhttps://airportle.club\n\n`;
  for (const g of guesses) {
    const line = g.result.map(r => r === 'correct' ? '🟩' : r === 'present' ? '🟨' : '⬛').join('');
    text += line + '\n';
  }
  return text.trim();
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  } else {
    showToast('Share not supported');
  }
}

function share() {
  const text = generateShareText();
  if (navigator.canShare && navigator.canShare({ text })) {
    navigator.share({ text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

document.getElementById('share-btn').addEventListener('click', share);
document.getElementById('result-share-btn').addEventListener('click', share);

// --- Result modal ---
function showResultModal(won) {
  const title = document.getElementById('result-title');
  const airport = document.getElementById('result-airport');

  if (won) {
    title.textContent = 'You got it!';
  } else {
    title.textContent = `The answer was ${answer}`;
  }
  const location = [todayAnswer.city, todayAnswer.country].filter(Boolean).join(', ');
  airport.textContent = location ? `${todayAnswer.name} — ${location}` : todayAnswer.name;
  openModal('result-modal');
}

// --- Init ---
const saved = loadGameState();
if (saved) {
  restoreGame(saved);
  // Don't auto-show modal on reload
} else {
  // Show help on first ever visit
  if (!localStorage.getItem('airportle-stats')) {
    setTimeout(() => openModal('help-modal'), 500);
  }
}
