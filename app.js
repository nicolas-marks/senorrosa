
// Señor Rosa — Flashcards app
const DECK_URL = 'assets/words.csv';
const ROTATION_MS = 2000; // interval in ms
const SHUFFLE = true;

let deck = [];
let idx = 0;
let timer = null;

const wordEl = document.getElementById('word');
const trEl = document.getElementById('translation');
const statusEl = document.getElementById('status');

function parseCSV(text) {
  const rows = [];
  let cur = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(cur.trim()); cur='';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur.length || row.length) { row.push(cur.trim()); rows.push(row); }
      cur=''; row=[];
      if (c === '\r' && next === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows.filter(r => r.length >= 2 && r[0] && r[1]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadDeck() {
  try {
    const res = await fetch(DECK_URL, {cache: 'no-cache'});
    const text = await res.text();
    const rows = parseCSV(text);
    const looksHeader = rows[0] && rows[0][0].toLowerCase().includes('spanish');
    const data = looksHeader ? rows.slice(1) : rows;
    deck = data.map(r => ({ es: r[0], en: r[1] }));
    if (deck.length === 0) throw new Error('Empty deck');
    if (SHUFFLE) shuffle(deck);
    statusEl.textContent = `Loaded ${deck.length} cards • rotating every ${ROTATION_MS/1000}s`;
    start();
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Could not load deck. Check assets/words.csv';
    wordEl.textContent = 'Deck error';
    trEl.textContent = e.message || '';
  }
}

function showCard() {
  const card = deck[idx % deck.length];
  wordEl.textContent = card.es;
  trEl.textContent = card.en;
  const container = document.getElementById('card');
  container.classList.remove('fade');
  void container.offsetWidth; // reflow
  container.classList.add('fade');
  idx++;
}

function start() {
  stop();
  showCard();
  timer = setInterval(showCard, ROTATION_MS);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (timer) { stop(); statusEl.textContent += ' • paused'; }
    else { start(); }
    e.preventDefault();
  } else if (e.code === 'ArrowRight') {
    stop(); showCard();
  } else if (e.code === 'ArrowLeft') {
    stop(); idx = (idx - 2 + deck.length) % deck.length; showCard();
  }
});

loadDeck();
