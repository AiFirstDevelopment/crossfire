import './style.css';
import { GameClient, GameState } from './game';
import { CrosswordUI } from './crossword-ui';
import englishWords from 'an-array-of-english-words';

// Create a Set for O(1) word lookup
const validWords = new Set(englishWords.map(w => w.toUpperCase()));

// Elements
const screens = {
  menu: document.getElementById('screen-menu')!,
  waiting: document.getElementById('screen-waiting')!,
  submit: document.getElementById('screen-submit')!,
  solve: document.getElementById('screen-solve')!,
  results: document.getElementById('screen-results')!,
};

const findMatchBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
const statusText = document.getElementById('status-text')!;
const roomIdInput = document.getElementById('room-id-input') as HTMLInputElement;
const joinRoomBtn = document.getElementById('join-room-btn') as HTMLButtonElement;
const waitingInfo = document.getElementById('waiting-info')!;
const wordForm = document.getElementById('word-form') as HTMLFormElement;
const wordInputs = document.querySelectorAll('.word-input') as NodeListOf<HTMLInputElement>;
const timerSubmit = document.getElementById('timer-submit')!;
const submitFormSection = document.getElementById('submit-form-section')!;
const submitWaitingSection = document.getElementById('submit-waiting-section')!;
const timerSolve = document.getElementById('timer-solve')!;
const yourProgress = document.getElementById('your-progress')!;
const opponentProgressEl = document.getElementById('opponent-progress')!;
const crosswordContainer = document.getElementById('crossword-container')!;
const resultTitle = document.getElementById('result-title')!;
const resultDetails = document.getElementById('result-details')!;
const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
const errorToast = document.getElementById('error-toast')!;

let game: GameClient;
let crosswordUI: CrosswordUI | null = null;
let timerInterval: number | null = null;

function init() {
  game = new GameClient();

  game.onStateChange(handleStateChange);

  findMatchBtn.addEventListener('click', () => {
    findMatchBtn.disabled = true;
    statusText.textContent = 'Finding match...';
    game.findMatch();
  });

  joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
      game.connectToRoom(roomId);
    }
  });

  // Add blur validation to word inputs
  wordInputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateWordInput(input);
    });
    input.addEventListener('input', () => {
      // Clear invalid state when user starts typing again
      input.classList.remove('invalid');
    });
  });

  wordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const words = Array.from(wordInputs).map(input => input.value.trim().toUpperCase());

    // Validate all words before submission
    let hasInvalid = false;
    wordInputs.forEach(input => {
      if (!validateWordInput(input)) {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      return;
    }

    if (words.some(w => w.length < 3)) {
      showError('Each word must be at least 3 letters');
      return;
    }

    game.submitWords(words);
    stopTimer();
    submitFormSection.classList.add('hidden');
    submitWaitingSection.classList.remove('hidden');
  });

  playAgainBtn.addEventListener('click', () => {
    game.reset();
    showScreen('menu');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });
}

function handleStateChange(state: GameState) {
  // Update error display
  if (state.error) {
    showError(state.error);
  }

  // Update screens based on phase
  switch (state.phase) {
    case 'connecting':
      statusText.textContent = 'Connecting...';
      break;

    case 'matchmaking':
      statusText.textContent = 'In queue, waiting for opponent...';
      break;

    case 'waiting':
      showScreen('waiting');
      waitingInfo.textContent = state.opponentName
        ? `Playing against ${state.opponentName}`
        : 'Waiting for opponent to join...';
      break;

    case 'submitting':
      showScreen('submit');
      submitFormSection.classList.remove('hidden');
      submitWaitingSection.classList.add('hidden');
      wordForm.querySelector('button')!.disabled = false;
      wordInputs.forEach(input => input.value = '');
      startTimer(state.submissionTimeoutMs, state.phaseStartedAt, timerSubmit);
      break;

    case 'solving':
      showScreen('solve');
      if (state.grid && !crosswordUI) {
        crosswordUI = new CrosswordUI(crosswordContainer, {
          grid: state.grid,
          filledCells: state.filledCells,
          cellCorrectness: state.cellCorrectness,
          onCellChange: (row, col, letter) => game.updateCell(row, col, letter),
          onHintRequest: (row, col) => game.requestHint('reveal-letter', { row, col }),
        });
        crosswordUI.focusFirstCell();
      } else if (crosswordUI) {
        crosswordUI.update(state.filledCells, state.cellCorrectness);
      }
      updateProgress(state);
      startTimer(state.solvingTimeoutMs, state.phaseStartedAt, timerSolve);
      break;

    case 'finished':
      showScreen('results');
      stopTimer();
      showResults(state);
      crosswordUI = null;
      break;
  }
}

function showScreen(name: keyof typeof screens) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function showError(message: string) {
  errorToast.textContent = message;
  errorToast.classList.remove('hidden');
  setTimeout(() => errorToast.classList.add('hidden'), 5000);
}

function startTimer(durationMs: number, startedAt: number, element: HTMLElement) {
  stopTimer();

  const update = () => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, durationMs - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    element.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

    if (remaining <= 10000) {
      element.classList.add('warning');
    } else {
      element.classList.remove('warning');
    }
  };

  update();
  timerInterval = window.setInterval(update, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateProgress(state: GameState) {
  // Calculate your progress
  const grid = state.grid;
  if (!grid) return;

  let totalCells = 0;
  let correctCells = 0;

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.cells[row][col]) {
        totalCells++;
        const key = `${row},${col}`;
        if (state.cellCorrectness[key] === true) {
          correctCells++;
        }
      }
    }
  }

  const yourPercent = totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;
  yourProgress.textContent = `${yourPercent}%`;
  opponentProgressEl.textContent = `${state.opponentProgress}%`;
}

function showResults(state: GameState) {
  const result = state.result;
  if (!result) return;

  const isWinner = result.winnerId === state.playerId;
  const isTie = result.winReason === 'tie';

  if (isTie) {
    resultTitle.textContent = "It's a Tie!";
  } else if (isWinner) {
    resultTitle.textContent = 'You Win!';
  } else {
    resultTitle.textContent = 'You Lose';
  }

  let details = `<p><strong>Reason:</strong> ${formatWinReason(result.winReason)}</p>`;
  details += `<p><strong>Your progress:</strong> ${result.yourProgress}%</p>`;
  details += `<p><strong>Opponent progress:</strong> ${result.opponentProgress}%</p>`;

  if (result.yourTime > 0) {
    details += `<p><strong>Your time:</strong> ${formatTime(result.yourTime)}</p>`;
  }
  if (result.opponentTime > 0) {
    details += `<p><strong>Opponent time:</strong> ${formatTime(result.opponentTime)}</p>`;
  }

  resultDetails.innerHTML = details;
}

function formatWinReason(reason: string): string {
  switch (reason) {
    case 'completed': return 'Puzzle completed';
    case 'timeout': return 'Time ran out';
    case 'opponent-left': return 'Opponent left';
    case 'tie': return 'Both finished at the same time';
    default: return reason;
  }
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function validateWordInput(input: HTMLInputElement): boolean {
  const word = input.value.trim().toUpperCase();

  // Empty is ok (not filled yet)
  if (!word) {
    input.classList.remove('invalid');
    return true;
  }

  // Check minimum length
  if (word.length < 3) {
    input.classList.add('invalid');
    showError('Word must be at least 3 letters');
    return false;
  }

  // Check if valid English word
  if (!validWords.has(word)) {
    input.classList.add('invalid');
    showError(`"${word}" is not a valid English word`);
    return false;
  }

  input.classList.remove('invalid');
  return true;
}

// Initialize
init();
console.log('Crossfire initialized');
