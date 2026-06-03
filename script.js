const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const muteButton = document.getElementById('muteButton');
const volumeSlider = document.getElementById('volumeSlider');
const guessInput = document.getElementById('guessInput');
const guessButton = document.getElementById('guessButton');
const skipButton = document.getElementById('skipButton');
const clearButton = document.getElementById('clearButton');
const nextButton = document.getElementById('nextButton');
const shareButton = document.getElementById('shareButton');
const message = document.getElementById('message');
const attemptsBox = document.getElementById('attempts');
const resultPanel = document.getElementById('resultPanel');
const resultTitle = document.getElementById('resultTitle');
const answerText = document.getElementById('answerText');
const snippetLength = document.getElementById('snippetLength');
const currentTime = document.getElementById('currentTime');
const songOptions = document.getElementById('songOptions');

// true = a song can appear again immediately.
// false = it shuffles through every song once before repeats.
const ALLOW_REPEATS = true;

const snippetSteps = [1, 2, 4, 7, 11, 16];
let songs = [];
let bag = [];
let currentSong = null;
let currentAttempt = 0;
let round = 1;
let locked = false;
let stopTimer = null;

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function cleanPath(file) {
  return String(file || '').replace(/^\.\//, '').trim();
}

function normalizeSongs(data) {
  // Accept both formats:
  // [ { title, game, file } ]
  // { "songs": [ { title, game, file } ] }
  const list = Array.isArray(data) ? data : data.songs;
  if (!Array.isArray(list)) return [];

  return list
    .map(song => ({
      title: String(song.title || song.name || '').trim(),
      game: String(song.game || '').trim(),
      file: cleanPath(song.file || song.path || song.src || song.filename)
    }))
    .filter(song => song.title && song.file);
}

async function loadSongs() {
  try {
    // Local-debug friendly loading.
    // songs.js is loaded before this file and creates window.SONGS.
    // This works by double-clicking index.html, with no local server needed.
    if (Array.isArray(window.SONGS)) {
      songs = normalizeSongs(window.SONGS);
    } else {
      // Optional fallback for people who prefer songs.json on GitHub Pages / a local server.
      const response = await fetch(`songs.json?cache=${Date.now()}`);
      if (!response.ok) throw new Error('songs.js or songs.json not found');
      const data = await response.json();
      songs = normalizeSongs(data);
    }

    if (!songs.length) throw new Error('No valid songs found. Each song needs at least title and file.');

    buildDatalist();
    drawEmptyAttempts();
    startRound();
  } catch (error) {
    message.textContent = error.message || 'Could not load songs. Check songs.js and the music folder.';
    disableGame(true);
    console.error(error);
  }
}

function buildDatalist() {
  songOptions.innerHTML = '';
  songs.forEach(song => {
    const titleOption = document.createElement('option');
    titleOption.value = song.title;
    songOptions.appendChild(titleOption);

    if (song.game) {
      const fullOption = document.createElement('option');
      fullOption.value = `${song.title} — ${song.game}`;
      songOptions.appendChild(fullOption);
    }
  });
}

function pickSong() {
  if (ALLOW_REPEATS) {
    return songs[Math.floor(Math.random() * songs.length)];
  }

  if (!bag.length) bag = [...songs];
  const index = Math.floor(Math.random() * bag.length);
  return bag.splice(index, 1)[0];
}

function drawEmptyAttempts() {
  attemptsBox.innerHTML = '';
  for (let i = 0; i < snippetSteps.length; i++) {
    const row = document.createElement('div');
    row.className = 'attempt-row empty';
    row.innerHTML = '<span class="square"></span><span></span>';
    attemptsBox.appendChild(row);
  }
}

function startRound() {
  currentSong = pickSong();
  currentAttempt = 0;
  locked = false;
  audio.src = encodeURI(currentSong.file).replace(/#/g, '%23');
  audio.load();
  audio.volume = Number(volumeSlider.value);
  guessInput.value = '';
  drawEmptyAttempts();
  resultPanel.classList.add('hidden');
  message.textContent = `${songs.length} songs loaded. Ready.`;
  updateSnippetLabel();
  updateTimeline();
  disableGame(false);
}

function updateSnippetLabel() {
  snippetLength.textContent = formatTime(snippetSteps[currentAttempt]);
  skipButton.textContent = currentAttempt + 1 >= snippetSteps.length ? 'SKIP' : `SKIP (+${snippetSteps[currentAttempt + 1] - snippetSteps[currentAttempt]}S)`;
}

function updateTimeline() {
  snippetSteps.forEach((_, index) => {
    const segment = document.getElementById(`segment${index}`);
    segment.className = 'segment';
    if (index < currentAttempt) segment.classList.add('done');
    if (index === currentAttempt) segment.classList.add('active');
  });
}

function disableGame(disabled) {
  playButton.disabled = disabled;
  guessButton.disabled = disabled;
  skipButton.disabled = disabled;
  guessInput.disabled = disabled;
}

function playSnippet() {
  if (!currentSong || locked) return;

  clearInterval(stopTimer);
  audio.pause();
  audio.currentTime = 0;
  currentTime.textContent = '0:00';

  const duration = snippetSteps[currentAttempt];
  audio.play().then(() => {
    playButton.textContent = '❚❚';
  }).catch(() => {
    message.textContent = `Audio could not play: ${currentSong.file}. Check filename/path and use mp3, ogg, wav, m4a, or aac.`;
  });

  stopTimer = setInterval(() => {
    currentTime.textContent = formatTime(audio.currentTime);
    if (audio.currentTime >= duration) {
      audio.pause();
      clearInterval(stopTimer);
      playButton.textContent = '▶';
      currentTime.textContent = '0:00';
    }
  }, 50);
}

function setAttempt(text, kind) {
  const row = attemptsBox.children[currentAttempt];
  row.className = `attempt-row ${kind}`;
  row.innerHTML = `<span class="square"></span><span>${text}</span>`;
}

function guessMatches(guess, song) {
  const clean = normalize(guess);
  return clean === normalize(song.title) ||
         clean === normalize(`${song.title}${song.game || ''}`) ||
         clean === normalize(`${song.title} — ${song.game || ''}`);
}

function submitGuess() {
  if (locked) return;
  const guess = guessInput.value.trim();
  if (!guess) {
    message.textContent = 'Type a song title or skip.';
    return;
  }

  if (guessMatches(guess, currentSong)) {
    setAttempt(guess, 'correct');
    finishRound(true);
  } else {
    setAttempt(guess, 'wrong');
    nextAttempt();
  }
  guessInput.value = '';
}

function skipGuess() {
  if (locked) return;
  setAttempt('SKIPPED', 'skipped');
  nextAttempt();
}

function nextAttempt() {
  currentAttempt++;
  if (currentAttempt >= snippetSteps.length) {
    finishRound(false);
    return;
  }
  updateSnippetLabel();
  updateTimeline();
  message.textContent = `Snippet increased to ${formatTime(snippetSteps[currentAttempt])}.`;
}

function finishRound(won) {
  locked = true;
  audio.pause();
  clearInterval(stopTimer);
  playButton.textContent = '▶';
  disableGame(true);
  resultPanel.classList.remove('hidden');
  resultTitle.textContent = won ? 'Correct!' : 'Song missed!';
  answerText.textContent = `Answer: ${currentSong.title}${currentSong.game ? ` — ${currentSong.game}` : ''}`;
  message.textContent = won ? 'Nice guess.' : 'Better luck next song.';
}

function nextRound() {
  round++;
  startRound();
}

async function copyResult() {
  const won = resultTitle.textContent.includes('Correct');
  const text = `Astrobot Heardle ${round}\n${won ? '✅' : '❌'} ${Math.min(currentAttempt + 1, snippetSteps.length)}/${snippetSteps.length}\nAnswer: ${currentSong.title}`;
  try {
    await navigator.clipboard.writeText(text);
    message.textContent = 'Result copied.';
  } catch {
    message.textContent = text;
  }
}

playButton.addEventListener('click', playSnippet);
muteButton.addEventListener('click', () => {
  audio.muted = !audio.muted;
  muteButton.textContent = audio.muted ? '🔇' : '🔊';
});
volumeSlider.addEventListener('input', () => {
  audio.volume = Number(volumeSlider.value);
});
clearButton.addEventListener('click', () => {
  guessInput.value = '';
  guessInput.focus();
});
guessButton.addEventListener('click', submitGuess);
skipButton.addEventListener('click', skipGuess);
nextButton.addEventListener('click', nextRound);
shareButton.addEventListener('click', copyResult);
guessInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') submitGuess();
});
audio.addEventListener('ended', () => {
  playButton.textContent = '▶';
  currentTime.textContent = '0:00';
});
audio.addEventListener('error', () => {
  if (currentSong) {
    message.textContent = `Could not load audio: ${currentSong.file}. Check exact filename, extension, and folder.`;
  }
});

loadSongs();
