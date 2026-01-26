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
const hintToast = document.getElementById('hint-toast')!;
const penaltyDisplay = document.getElementById('penalty-display')!;
const penaltyTime = document.getElementById('penalty-time')!;

let game: GameClient;
let crosswordUI: CrosswordUI | null = null;
let timerInterval: number | null = null;
let lastSubmittedWords: string[] = []; // Store words for resubmit scenarios
let accumulatedPenalty = 0;

function init() {
  game = new GameClient();

  game.onStateChange(handleStateChange);
  game.onHintUsed(showHintPenalty);

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

  const submitBtn = wordForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  submitBtn.disabled = true;

  const updateSubmitButton = () => {
    const allValid = Array.from(wordInputs).every(input => {
      const word = input.value.trim().toUpperCase();
      return word.length >= 3 && validWords.has(word);
    });
    submitBtn.disabled = !allValid;
  };

  // Add blur validation to word inputs
  wordInputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateWordInput(input);
      updateSubmitButton();
    });
    input.addEventListener('input', () => {
      // Clear invalid state when user starts typing again
      input.classList.remove('invalid');
      const errorEl = input.parentElement?.querySelector('.word-error') as HTMLElement;
      if (errorEl) errorEl.textContent = '';
      updateSubmitButton();
    });
  });

  wordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Store words in case we need to restore them after validation error
    lastSubmittedWords = Array.from(wordInputs).map(input => input.value.trim().toUpperCase());
    game.submitWords(lastSubmittedWords);
    stopTimer();
    submitFormSection.classList.add('hidden');
    submitWaitingSection.classList.remove('hidden');
  });

  playAgainBtn.addEventListener('click', () => {
    game.reset();
    lastSubmittedWords = []; // Clear stored words for new game
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
      // Restore words if we have them (resubmit after validation error)
      if (lastSubmittedWords.length === 4) {
        wordInputs.forEach((input, i) => {
          input.value = lastSubmittedWords[i];
          input.classList.remove('invalid');
          const errorEl = input.parentElement?.querySelector('.word-error') as HTMLElement;
          if (errorEl) errorEl.textContent = '';
        });
        // Re-validate and update button state
        const allValid = lastSubmittedWords.every(word =>
          word.length >= 3 && validWords.has(word)
        );
        wordForm.querySelector('button')!.disabled = !allValid;
      } else {
        // First entry - clear form
        wordInputs.forEach(input => {
          input.value = '';
          input.classList.remove('invalid');
          const errorEl = input.parentElement?.querySelector('.word-error') as HTMLElement;
          if (errorEl) errorEl.textContent = '';
        });
        wordForm.querySelector('button')!.disabled = true;
      }
      startTimer(state.submissionTimeoutMs, state.phaseStartedAt, timerSubmit);
      // Focus first input
      wordInputs[0]?.focus();
      break;

    case 'solving':
      showScreen('solve');
      lastSubmittedWords = []; // Words accepted, clear stored words
      if (state.grid && !crosswordUI) {
        // Reset penalty for new game
        accumulatedPenalty = 0;
        penaltyDisplay.classList.add('hidden');

        crosswordUI = new CrosswordUI(crosswordContainer, {
          grid: state.grid,
          filledCells: state.filledCells,
          cellCorrectness: state.cellCorrectness,
          onCellChange: (row, col, letter) => game.updateCell(row, col, letter),
          onHintRequest: (row, col) => game.requestHint('reveal-letter', { row, col }),
        });
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

function showHintPenalty(penaltyMs: number) {
  const seconds = Math.round(penaltyMs / 1000);
  hintToast.textContent = `+${seconds}s penalty`;
  hintToast.classList.remove('hidden');
  setTimeout(() => hintToast.classList.add('hidden'), 1500);

  // Update accumulated penalty display
  accumulatedPenalty += penaltyMs;
  const totalSeconds = Math.round(accumulatedPenalty / 1000);
  penaltyTime.textContent = String(totalSeconds);
  penaltyDisplay.classList.remove('hidden');
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
  const errorEl = input.parentElement?.querySelector('.word-error') as HTMLElement;

  const setError = (msg: string) => {
    input.classList.add('invalid');
    if (errorEl) errorEl.textContent = msg;
  };

  const clearError = () => {
    input.classList.remove('invalid');
    if (errorEl) errorEl.textContent = '';
  };

  // Empty is ok (not filled yet)
  if (!word) {
    clearError();
    return true;
  }

  // Check minimum length
  if (word.length < 3) {
    setError('Too short (min 3 letters)');
    return false;
  }

  // Check if valid English word
  if (!validWords.has(word)) {
    setError('Not a valid word');
    return false;
  }

  clearError();
  return true;
}

// Initialize
init();
console.log('Crossfire initialized');
