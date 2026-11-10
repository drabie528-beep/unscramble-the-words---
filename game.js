const words = [
  { letters: 'ELUCDSHE', answer: 'SCHEDULE' },
  { letters: 'MAET', answer: 'TEAM' },
  { letters: 'DAGANE', answer: 'AGENDA' },
  { letters: 'ELOR', answer: 'ROLE' },
  { letters: 'KATS', answer: 'TASK' }
];
const ROUND_SECONDS = 15;
const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbywzD9QNTqhxXsCGcOzmNGbo96APKs_UwjeDK0EtnBH6doTclADMiecDf9gqbXfe6gf/exec';
const GAME_BUILD = 'sheets-json-20261110';
const screens = [...document.querySelectorAll('.screen')];
const card = document.querySelector('#puzzle-card');
const input = document.querySelector('#answer-input');
const form = document.querySelector('#answer-form');
const registrationForm = document.querySelector('#registration-form');
const playerNameInput = document.querySelector('#player-name');
const feedback = document.querySelector('#card-feedback');
const checkButton = form.querySelector('button');
const homeLink = document.querySelector('[data-home]');
const timerWrap = document.querySelector('#timer-wrap');
const timerValue = document.querySelector('#timer-value');
const timerProgress = document.querySelector('#timer-progress');
const CIRCUMFERENCE = 2 * Math.PI * 25;

console.info(`[Game] ${GAME_BUILD} loaded. Google Sheets configured: ${Boolean(SHEETS_WEB_APP_URL)}.`);

let currentIndex = 0;
let score = 0;
let correctAnswers = 0;
let unansweredWords = 0;
let totalTimeSeconds = 0;
let playerName = '';
let gameStartedAt = 0;
let gameHasStarted = false;
let remaining = ROUND_SECONDS;
let timerId = null;
let deadline = 0;
let transitionId = null;
let transitioning = false;
let answerSubmitted = false;
let gameFinished = false;
let resultSubmissionSent = false;

timerProgress.style.strokeDasharray = String(CIRCUMFERENCE);
timerProgress.style.strokeDashoffset = '0';

function clearRoundTimers() {
  if (timerId !== null) window.clearInterval(timerId);
  if (transitionId !== null) window.clearTimeout(transitionId);
  timerId = null;
  transitionId = null;
}

function showScreen(id) {
  const homeDisabled = id === 'challenge' || id === 'reveal' || id === 'final';
  homeLink.classList.toggle('is-disabled', homeDisabled);
  homeLink.setAttribute('aria-disabled', String(homeDisabled));
  homeLink.tabIndex = homeDisabled ? -1 : 0;
  screens.forEach((screen) => {
    const active = screen.id === id;
    screen.classList.toggle('active', active);
    screen.setAttribute('aria-hidden', String(!active));
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress(completed = currentIndex) {
  const count = Math.min(words.length, completed);
  document.querySelector('#word-count').textContent = `WORD ${Math.min(currentIndex + 1, words.length)} OF ${words.length}`;
  document.querySelector('#progress-label').textContent = `${count} OF ${words.length} COMPLETE`;
  document.querySelector('#score-label').textContent = `SCORE ${score}/100`;
  document.querySelector('#progress-fill').style.width = `${(count / words.length) * 100}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', String(count));
}

function updateTimerDisplay() {
  const ratio = remaining / ROUND_SECONDS;
  timerValue.textContent = String(remaining).padStart(2, '0');
  timerProgress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - ratio));
  timerWrap.classList.toggle('is-low', remaining <= 8 && remaining > 5);
  timerWrap.classList.toggle('is-critical', remaining <= 5);
}

function startTimer() {
  clearInterval(timerId);
  remaining = ROUND_SECONDS;
  deadline = Date.now() + ROUND_SECONDS * 1000;
  timerWrap.classList.remove('is-low', 'is-critical');
  updateTimerDisplay();
  timerId = window.setInterval(() => {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    updateTimerDisplay();
    if (remaining === 0) handleTimeout();
  }, 200);
}

function renderWord() {
  clearRoundTimers();
  transitioning = false;
  answerSubmitted = false;
  const word = words[currentIndex];
  if (!word) {
    finishGame();
    return;
  }
  card.classList.remove('is-correct', 'is-wrong', 'is-time-up');
  document.querySelector('#card-number').textContent = `WORD ${String(currentIndex + 1).padStart(2, '0')}`;
  document.querySelector('#scrambled').innerHTML = [...word.letters].map((letter, index) => `<span class="scramble-letter" style="--i:${index}">${letter}</span>`).join('');
  document.querySelector('#scrambled').setAttribute('aria-label', `Scrambled letters ${[...word.letters].join(' ')}`);
  input.value = '';
  input.disabled = false;
  checkButton.disabled = false;
  feedback.textContent = 'Take a breath. You’ve got this. ✦';
  updateProgress(currentIndex);
  startTimer();
  window.setTimeout(() => input.focus({ preventScroll: true }), 80);
}

function advanceAfterFeedback(completed) {
  if (transitioning) return;
  transitioning = true;
  updateProgress(completed);
  transitionId = window.setTimeout(() => {
    transitionId = null;
    currentIndex += 1;
    if (currentIndex >= words.length) finishGame();
    else renderWord();
  }, 200);
}

function handleTimeout() {
  clearInterval(timerId);
  timerId = null;
  remaining = 0;
  updateTimerDisplay();
  if (transitioning || answerSubmitted) return;
  answerSubmitted = true;
  unansweredWords += 1;
  card.classList.add('is-time-up');
  input.disabled = true;
  checkButton.disabled = true;
  feedback.textContent = 'TIME’S UP! Take a breath — the next word is waiting. ✦';
  advanceAfterFeedback(currentIndex + 1);
}

function checkAnswer(event) {
  event.preventDefault();
  if (transitioning || answerSubmitted || timerId === null) return;
  if (Date.now() >= deadline) {
    remaining = 0;
    updateTimerDisplay();
    handleTimeout();
    return;
  }
  answerSubmitted = true;
  clearInterval(timerId);
  timerId = null;
  input.disabled = true;
  checkButton.disabled = true;
  const answer = input.value.trim().replace(/\s+/g, '').toUpperCase();
  if (answer === words[currentIndex].answer) {
    score += 20;
    correctAnswers += 1;
    card.classList.add('is-correct');
    feedback.textContent = ['Brilliant! SCHEDULE is solved! ✦', 'Yes! TEAM is solved! ✦', 'Nailed it! AGENDA is solved! ✦', 'Lovely work! ROLE is solved! ✦', 'Perfect! TASK is solved! ✦'][currentIndex];
  } else {
    if (!answer) unansweredWords += 1;
    card.classList.remove('is-wrong');
    void card.offsetWidth;
    card.classList.add('is-wrong');
    feedback.textContent = answer ? 'Not quite yet. Give those letters another look!' : 'Type your best guess first. You’ve got this!';
    if (navigator.vibrate) navigator.vibrate(70);
  }
  advanceAfterFeedback(currentIndex + 1);
}

function beginGame() {
  clearRoundTimers();
  currentIndex = 0;
  score = 0;
  correctAnswers = 0;
  unansweredWords = 0;
  totalTimeSeconds = 0;
  gameStartedAt = performance.now();
  gameHasStarted = true;
  remaining = ROUND_SECONDS;
  transitioning = false;
  gameFinished = false;
  resultSubmissionSent = false;
  renderWord();
  showScreen('challenge');
}

function restartRevealAnimation() {
  document.querySelectorAll('.reveal-letters span').forEach((letter) => {
    letter.style.animation = 'none';
  });
  void document.querySelector('.reveal-letters').offsetWidth;
  document.querySelectorAll('.reveal-letters span').forEach((letter) => {
    letter.style.removeProperty('animation');
  });
}

function finishGame() {
  if (gameFinished) return;
  gameFinished = true;
  clearRoundTimers();
  transitioning = false;
  totalTimeSeconds = Math.max(0, Math.round((performance.now() - gameStartedAt) / 1000));
  updateProgress(words.length);
  document.querySelector('#result-score').textContent = `${score} / 100`;
  document.querySelector('#result-correct').textContent = `${correctAnswers} / 5`;
  document.querySelector('#result-unanswered').textContent = String(unansweredWords);
  document.querySelector('#result-player').textContent = playerName;
  document.querySelector('#result-time').textContent = formatDuration(totalTimeSeconds);
  saveResult();
  restartRevealAnimation();
  showScreen('reveal');
}

function saveResult() {
  if (!SHEETS_WEB_APP_URL) {
    console.error('[Google Sheets] Result was not sent: Web App URL is not configured.');
    return;
  }
  if (resultSubmissionSent) {
    console.warn('[Google Sheets] Duplicate result submission blocked.');
    return;
  }
  resultSubmissionSent = true;
  const result = {
    playerName,
    finalScore: score,
    correctAnswers,
    unanswered: unansweredWords,
    totalTime: totalTimeSeconds
  };
  console.info('[Google Sheets] Sending one final result to the Web App.');
  Promise.resolve().then(() => fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(result)
  })).then(() => {
    console.info('[Google Sheets] Browser sent the no-cors request; verify the sheet because its response is hidden.');
  }).catch((error) => {
    console.error('[Google Sheets] Network request failed before completion.', error);
  });
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

form.addEventListener('submit', checkAnswer);
registrationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const enteredName = playerNameInput.value.trim();
  playerNameInput.setCustomValidity(enteredName ? '' : 'Please enter a name or nickname.');
  if (!enteredName) {
    playerNameInput.reportValidity();
    return;
  }
  playerName = enteredName;
  beginGame();
});
playerNameInput.addEventListener('input', () => playerNameInput.setCustomValidity(''));
document.querySelector('#play-button').addEventListener('click', () => {
  playerNameInput.value = '';
  showScreen('registration');
  window.setTimeout(() => playerNameInput.focus({ preventScroll: true }), 80);
});
document.querySelector('#registration-back').addEventListener('click', () => showScreen('welcome'));
document.querySelector('#message-button').addEventListener('click', () => showScreen('final'));
document.querySelector('#view-score-button').addEventListener('click', () => {
  if (!gameFinished) return;
  showScreen('reveal');
});
homeLink.addEventListener('click', (event) => {
  event.preventDefault();
  if (gameHasStarted) return;
  clearRoundTimers();
  currentIndex = 0;
  score = 0;
  correctAnswers = 0;
  unansweredWords = 0;
  totalTimeSeconds = 0;
  playerName = '';
  transitioning = false;
  gameFinished = false;
  resultSubmissionSent = false;
  playerNameInput.value = '';
  updateProgress(0);
  showScreen('welcome');
});
