import './style.css';
import { GameClient, GameState } from './game';
import { CrosswordUI } from './crossword-ui';
import { BotGame, BotGameState } from './bot';
import englishWords from 'an-array-of-english-words';
import humanId from 'human-id';
import { getCategorizedWords, getHint as getWordCategory, stemToken } from '../../shared/get-hint';
import { botWords as easyBotWords } from '../../shared/terms/bot.words';

// Create a Set for O(1) word lookup - only words with categories are valid
const categorizedWords = getCategorizedWords();
const validWords = new Set(
  englishWords
    .map(w => w.toUpperCase())
    .filter(w => categorizedWords.has(stemToken(w)))
);
// Word list for bot - use curated easy words, filtered to valid dictionary words
const wordList = easyBotWords.filter(w => categorizedWords.has(stemToken(w)));

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
const activeGamesEl = document.getElementById('active-games')!;
const totalGamesEl = document.getElementById('total-games')!;
const totalPlayersEl = document.getElementById('total-players')!;
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
const leaveRoomBtn = document.getElementById('leave-room-btn') as HTMLButtonElement;
const leaveWaitingBtn = document.getElementById('leave-waiting-btn') as HTMLButtonElement;
const leaveSubmitBtn = document.getElementById('leave-submit-btn') as HTMLButtonElement;
const leaveSolveBtn = document.getElementById('leave-solve-btn') as HTMLButtonElement;
const rematchStatus = document.getElementById('rematch-status')!;
const errorToast = document.getElementById('error-toast')!;
const hintToast = document.getElementById('hint-toast')!;
const solutionContainer = document.getElementById('solution-container')!;
const solutionGridEl = document.getElementById('solution-grid')!;
const penaltyDisplay = document.getElementById('penalty-display')!;
const penaltyTime = document.getElementById('penalty-time')!;
const hintsRemainingEl = document.getElementById('hints-remaining')!;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const opponentNameDisplay = document.getElementById('opponent-name-display')!;
const opponentLevelEl = document.getElementById('opponent-level')!;
const submitOpponentName = document.getElementById('submit-opponent-name')!;
const submitOpponentLevel = document.getElementById('submit-opponent-level')!;
const submitOpponentInfo = document.getElementById('submit-opponent-info')!;
const playerLevelEl = document.getElementById('player-level')!;
const playerWinsEl = document.getElementById('player-wins')!;
const winsLabelEl = document.getElementById('wins-label')!;
const winsToNextEl = document.getElementById('wins-to-next')!;
const playerIdEl = document.getElementById('player-id')!;
const playerIdDisplay = document.getElementById('player-id-display')!;
const changeIdBtn = document.getElementById('change-id-btn') as HTMLButtonElement;
const changeIdForm = document.getElementById('change-id-form')!;
const newIdInput = document.getElementById('new-id-input') as HTMLInputElement;
const saveIdBtn = document.getElementById('save-id-btn') as HTMLButtonElement;
const cancelIdBtn = document.getElementById('cancel-id-btn') as HTMLButtonElement;

let currentPlayerId: string = '';

let game: GameClient;
let botGame: BotGame | null = null;
let crosswordUI: CrosswordUI | null = null;
let timerInterval: number | null = null;
let lastSubmittedWords: string[] = []; // Store words for resubmit scenarios
let accumulatedPenalty = 0;
let isBotMode = false;
let botGameActive = false; // Track if bot game is active for game count
let winRecordedForCurrentGame = false; // Prevent duplicate win recording

function init() {
  game = new GameClient();
  game.setPlayerId(currentPlayerId);

  game.onStateChange(handleStateChange);
  game.onHintUsed(showHintUsed);
  game.onMatchmakingTimeout(startBotGame);

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

    const handleInputChange = () => {
      // Clear invalid state when user starts typing again
      input.classList.remove('invalid');
      const errorEl = input.closest('.word-input-wrapper')?.querySelector('.word-error') as HTMLElement;
      if (errorEl) errorEl.textContent = '';
      updateSubmitButton();
    };

    input.addEventListener('input', handleInputChange);
    // Mobile autocomplete selections may fire 'change' instead of 'input'
    input.addEventListener('change', handleInputChange);
    // Handle IME/composition end for mobile keyboards
    input.addEventListener('compositionend', handleInputChange);
  });

  wordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Store words in case we need to restore them after validation error
    lastSubmittedWords = Array.from(wordInputs).map(input => input.value.trim().toUpperCase());

    if (isBotMode && botGame) {
      const result = botGame.submitWords(lastSubmittedWords);
      if (!result.success) {
        showErrorWithSuggestions(result.error || 'Could not create puzzle from these words.', result.suggestions);
        return;
      }
    } else {
      game.submitWords(lastSubmittedWords);
    }
    stopTimer();
    submitFormSection.classList.add('hidden');
    submitWaitingSection.classList.remove('hidden');
  });

  playAgainBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.playAgain();
    } else {
      game.playAgain();
    }
  });

  leaveRoomBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      // Update active games count (removes bot game addition)
      updateActiveGames(game.getState().activeGames);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    crosswordUI = null;
    hideSolutionGrid();
    showScreen('menu');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  leaveWaitingBtn.addEventListener('click', () => {
    game.leaveRoom();
    showScreen('menu');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  leaveSubmitBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      updateActiveGames(game.getState().activeGames);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    showScreen('menu');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  leaveSolveBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      updateActiveGames(game.getState().activeGames);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    crosswordUI = null;
    hideSolutionGrid();
    showScreen('menu');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
}

// Start a bot game when matchmaking times out
function startBotGame() {
  // Cancel the real matchmaking
  game.cancelMatchmaking();

  // Create bot game
  isBotMode = true;
  botGameActive = true;
  botGame = new BotGame(validWords, wordList);
  botGame.onStateChange(handleBotStateChange);
  botGame.onHintUsed(showHintUsed);

  // Update active games count (adds 1 for bot game)
  updateActiveGames(game.getState().activeGames);

  // Show submission screen immediately
  statusText.textContent = `Playing against ${botGame.getBotName()}`;
}

function handleBotStateChange(state: BotGameState) {
  switch (state.phase) {
    case 'submitting':
      // Reset win tracking for new game
      winRecordedForCurrentGame = false;
      showScreen('submit');
      submitFormSection.classList.remove('hidden');
      submitWaitingSection.classList.add('hidden');
      // Show bot opponent info on submit screen
      submitOpponentInfo.classList.remove('hidden');
      submitOpponentName.textContent = state.botName;
      submitOpponentLevel.textContent = '1';
      // Clear form for new game
      if (lastSubmittedWords.length === 0) {
        wordInputs.forEach(input => {
          input.value = '';
          input.classList.remove('invalid');
          const errorEl = input.closest('.word-input-wrapper')?.querySelector('.word-error') as HTMLElement;
          if (errorEl) errorEl.textContent = '';
        });
        wordForm.querySelector('button')!.disabled = true;
      }
      startTimer(state.submissionTimeoutMs, state.phaseStartedAt, timerSubmit);
      wordInputs[0]?.focus();
      break;

    case 'solving':
      showScreen('solve');
      lastSubmittedWords = [];
      // Show bot opponent info (bot level is always 1)
      opponentNameDisplay.textContent = state.botName;
      opponentLevelEl.textContent = '1';
      if (state.playerGrid && !crosswordUI) {
        // Reset hints display for bot mode
        hintsRemainingEl.textContent = String(state.maxHints - state.hintsUsed);
        penaltyDisplay.classList.add('hidden');

        crosswordUI = new CrosswordUI(crosswordContainer, {
          grid: state.playerGrid,
          filledCells: state.playerFilledCells,
          cellCorrectness: state.playerCellCorrectness,
          onCellChange: (row, col, letter) => botGame?.updateCell(row, col, letter),
          onHintRequest: (row, col) => botGame?.requestHint(row, col),
        });
      } else if (crosswordUI) {
        crosswordUI.update(state.playerFilledCells, state.playerCellCorrectness);
      }
      updateBotProgress(state);
      startTimer(state.solvingTimeoutMs, state.phaseStartedAt, timerSolve);
      break;

    case 'finished':
      showScreen('results');
      stopTimer();
      showBotResults(state);
      // Hide rematch status for bot games (bot always accepts rematch)
      rematchStatus.classList.add('hidden');
      playAgainBtn.disabled = false;
      crosswordUI = null;
      break;
  }
}

function updateBotProgress(state: BotGameState) {
  const grid = state.playerGrid;
  if (!grid) return;

  let totalCells = 0;
  let correctCells = 0;

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.cells[row][col]) {
        totalCells++;
        const key = `${row},${col}`;
        if (state.playerCellCorrectness[key] === true) {
          correctCells++;
        }
      }
    }
  }

  const yourPercent = totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;
  yourProgress.textContent = `${yourPercent}%`;
  opponentProgressEl.textContent = `${state.botProgress}%`;
}

function showBotResults(state: BotGameState) {
  const result = state.result;
  if (!result) return;

  const isWinner = result.winnerId === 'player';
  const isTie = result.winReason === 'tie';

  if (isTie) {
    resultTitle.textContent = "It's a Tie!";
  } else if (isWinner) {
    resultTitle.textContent = 'You Win!';
    recordWin();
  } else {
    resultTitle.textContent = 'Your opponent Wins!';
  }

  let details = `<p><strong>Reason:</strong> ${formatWinReason(result.winReason)}</p>`;
  details += `<p><strong>Your progress:</strong> ${result.yourProgress}%</p>`;
  details += `<p><strong>Opponent progress:</strong> ${result.opponentProgress}%</p>`;

  if (result.yourTime > 0) {
    details += `<p><strong>Your time:</strong> ${formatTime(result.yourTime)}</p>`;
  }

  resultDetails.innerHTML = details;

  // Show solution grid for losers and ties in bot mode
  if ((!isWinner || isTie) && state.playerGridFull) {
    // Extract solution from the full grid
    const solution: Record<string, string> = {};
    for (let row = 0; row < state.playerGridFull.height; row++) {
      for (let col = 0; col < state.playerGridFull.width; col++) {
        const cell = state.playerGridFull.cells[row][col];
        if (cell) {
          solution[`${row},${col}`] = cell.letter;
        }
      }
    }
    // Build words array with categories for clues
    const words: SolutionWord[] = state.playerGridFull.words.map(w => ({
      index: w.index,
      direction: w.direction,
      category: getWordCategory(w.word) || 'word',
      length: w.word.length,
    }));
    renderSolutionGrid(state.playerGridFull, solution, words);
  } else {
    hideSolutionGrid();
  }
}

function handleStateChange(state: GameState) {
  // Always update stats displays
  updateActiveGames(state.activeGames);
  updateTotalGames(state.totalGamesPlayed);
  updateTotalPlayers(state.totalPlayers);

  // Update error display
  if (state.error) {
    // If this is a grid failure error (words don't share letters), show inline suggestions instead of toast
    if (state.error.includes("share no letters") || state.error.includes("can't make a crossword")) {
      const suggestions = generateGridFailureSuggestions(lastSubmittedWords);
      showErrorWithSuggestions(state.error, suggestions);
    } else {
      showError(state.error);
    }
  }

  // Update screens based on phase
  switch (state.phase) {
    case 'connecting':
      // Return to menu screen (e.g., after connection rejection)
      showScreen('menu');
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
      // Reset win tracking for new game
      winRecordedForCurrentGame = false;
      showScreen('submit');
      submitFormSection.classList.remove('hidden');
      submitWaitingSection.classList.add('hidden');
      // Show opponent info on submit screen
      if (state.opponentName) {
        submitOpponentInfo.classList.remove('hidden');
        submitOpponentName.textContent = state.opponentName;
        fetchOpponentLevel(state.opponentName).then(level => {
          submitOpponentLevel.textContent = String(level);
        });
      } else {
        submitOpponentInfo.classList.add('hidden');
      }
      // Restore words if we have them (resubmit after validation error)
      if (lastSubmittedWords.length === 4) {
        wordInputs.forEach((input, i) => {
          input.value = lastSubmittedWords[i];
          input.classList.remove('invalid');
          const errorEl = input.closest('.word-input-wrapper')?.querySelector('.word-error') as HTMLElement;
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
          const errorEl = input.closest('.word-input-wrapper')?.querySelector('.word-error') as HTMLElement;
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
      // Show opponent info
      if (state.opponentName) {
        opponentNameDisplay.textContent = state.opponentName;
        // Fetch opponent's level (use playerId extracted from name or stored)
        fetchOpponentLevel(state.opponentName);
      }
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
      updateRematchStatus(state);
      crosswordUI = null;
      break;
  }
}

function showScreen(name: keyof typeof screens) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function updateActiveGames(serverCount: number) {
  // Add 1 to server count if a bot game is active
  const count = botGameActive ? serverCount + 1 : serverCount;
  const plural = count === 1 ? 'game' : 'games';
  activeGamesEl.textContent = `${count} ${plural} in progress`;
}

function updateTotalGames(count: number) {
  totalGamesEl.textContent = `${count.toLocaleString()} games played`;
}

function updateTotalPlayers(count: number) {
  totalPlayersEl.textContent = `Players: ${count.toLocaleString()}`;
}

function showError(message: string) {
  errorToast.textContent = message;
  errorToast.classList.remove('hidden');
  setTimeout(() => errorToast.classList.add('hidden'), 5000);
}

// Generate replacement suggestions for words that don't share letters (for multiplayer grid failures)
function generateGridFailureSuggestions(words: string[]): { wordIndex: number; replacements: string[] }[] {
  const normalized = words.map(w => w.toUpperCase());

  const getLetters = (word: string): Set<string> => new Set(word.split(''));

  const sharedLetters = (word1: string, word2: string): string[] => {
    const letters1 = getLetters(word1);
    const letters2 = getLetters(word2);
    return [...letters1].filter(l => letters2.has(l));
  };

  // Find all pairs that don't share letters and track problematic word indices
  const problematicIndices = new Set<number>();
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const shared = sharedLetters(normalized[i], normalized[j]);
      if (shared.length === 0) {
        problematicIndices.add(i);
        problematicIndices.add(j);
      }
    }
  }

  // Find replacement candidates for a word index
  const findReplacements = (wordIndex: number): string[] => {
    const otherWords = normalized.filter((_, i) => i !== wordIndex);
    const otherLetters = new Set<string>();
    otherWords.forEach(w => getLetters(w).forEach(l => otherLetters.add(l)));

    // Find words that share at least 2 letters with the other words
    const candidates = wordList
      .filter(w => {
        const upper = w.toUpperCase();
        if (upper === normalized[wordIndex]) return false;
        if (normalized.includes(upper)) return false;
        const letters = getLetters(upper);
        const shared = [...letters].filter(l => otherLetters.has(l));
        return shared.length >= 2 && w.length >= 3 && w.length <= 8;
      })
      .slice(0, 100);

    // Shuffle and take top 5
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5).map(w => w.toUpperCase());
  };

  // If we found problematic pairs, show suggestions for all involved words
  if (problematicIndices.size > 0) {
    return [...problematicIndices].map(idx => ({
      wordIndex: idx,
      replacements: findReplacements(idx)
    }));
  }

  // Fallback: find word with weakest overall connectivity
  const connectionScores = normalized.map((word, i) => {
    let totalShared = 0;
    for (let j = 0; j < normalized.length; j++) {
      if (i !== j) {
        totalShared += sharedLetters(word, normalized[j]).length;
      }
    }
    return { index: i, score: totalShared };
  });

  connectionScores.sort((a, b) => a.score - b.score);
  const weakestIndex = connectionScores[0].index;

  return [{
    wordIndex: weakestIndex,
    replacements: findReplacements(weakestIndex)
  }];
}

function clearInlineSuggestions(index?: number) {
  if (index !== undefined) {
    // Clear only suggestions for a specific word
    const input = wordInputs[index];
    const suggestionDiv = input?.parentElement?.querySelector('.inline-suggestions');
    if (suggestionDiv) suggestionDiv.innerHTML = '';
  } else {
    // Clear all suggestions
    document.querySelectorAll('.inline-suggestions').forEach(el => {
      el.innerHTML = '';
    });
  }
}

function showErrorWithSuggestions(_message: string, suggestions?: { wordIndex: number; replacements: string[] }[]) {
  // Clear any existing inline suggestions
  clearInlineSuggestions();

  // Add inline suggestions next to each relevant word input
  if (suggestions && suggestions.length > 0) {
    for (const suggestion of suggestions) {
      if (suggestion.replacements.length === 0) continue;

      const input = wordInputs[suggestion.wordIndex];
      if (!input) continue;

      const suggestionDiv = input.parentElement?.querySelector('.inline-suggestions');
      if (!suggestionDiv) continue;

      // Add hint explaining the issue
      const hint = document.createElement('span');
      hint.className = 'suggestion-hint';
      hint.textContent = 'no shared letters — try these or type your own:';
      suggestionDiv.appendChild(hint);

      for (const word of suggestion.replacements) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inline-suggestion-btn';
        btn.textContent = word;
        btn.onclick = () => {
          // Replace the word in the input
          wordInputs[suggestion.wordIndex].value = word;
          wordInputs[suggestion.wordIndex].classList.remove('invalid');
          const wrapper = input.closest('.word-input-wrapper');
          const errorEl = wrapper?.querySelector('.word-error') as HTMLElement;
          if (errorEl) errorEl.textContent = '';
          // Clear only this word's suggestions
          clearInlineSuggestions(suggestion.wordIndex);
          // Focus the input
          wordInputs[suggestion.wordIndex].focus();
        };
        suggestionDiv.appendChild(btn);
      }
    }
  }
}

function showHintUsed(hintsRemainingOrPenaltyMs: number) {
  if (isBotMode) {
    // Bot mode: parameter is hints remaining
    const remaining = hintsRemainingOrPenaltyMs;
    hintsRemainingEl.textContent = String(remaining);
    if (remaining === 0) {
      hintToast.textContent = 'No hints left';
    } else {
      hintToast.textContent = `${remaining} hint${remaining === 1 ? '' : 's'} left`;
    }
    hintToast.classList.remove('hidden');
    setTimeout(() => hintToast.classList.add('hidden'), 1500);
  } else {
    // Multiplayer mode: parameter is penalty in ms
    const seconds = Math.round(hintsRemainingOrPenaltyMs / 1000);
    hintToast.textContent = `+${seconds}s penalty`;
    hintToast.classList.remove('hidden');
    setTimeout(() => hintToast.classList.add('hidden'), 1500);

    // Update accumulated penalty display
    accumulatedPenalty += hintsRemainingOrPenaltyMs;
    const totalSeconds = Math.round(accumulatedPenalty / 1000);
    penaltyTime.textContent = String(totalSeconds);
    penaltyDisplay.classList.remove('hidden');
  }
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

interface SolutionWord {
  index: number;
  direction: 'across' | 'down';
  category: string;
  length: number;
}

function renderSolutionGrid(
  grid: { width: number; height: number; cells: (unknown | null)[][] },
  solution: Record<string, string>,
  words?: SolutionWord[]
) {
  solutionGridEl.innerHTML = '';

  // Create layout container like crossword-ui
  const layout = document.createElement('div');
  layout.className = 'crossword-layout';

  // Create grid
  const gridDiv = document.createElement('div');
  gridDiv.className = 'crossword-grid';
  gridDiv.style.display = 'grid';
  gridDiv.style.gridTemplateColumns = `repeat(${grid.width}, 44px)`;
  gridDiv.style.gridTemplateRows = `repeat(${grid.height}, 44px)`;
  gridDiv.style.gap = '2px';

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const cell = grid.cells[row][col];
      const wrapper = document.createElement('div');
      wrapper.className = 'crossword-cell-wrapper';

      if (cell === null) {
        wrapper.classList.add('black');
      } else {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'crossword-cell';
        cellDiv.textContent = solution[`${row},${col}`] || '';
        wrapper.appendChild(cellDiv);
      }

      gridDiv.appendChild(wrapper);
    }
  }

  layout.appendChild(gridDiv);

  // Add clues if provided
  if (words && words.length > 0) {
    const cluesContainer = document.createElement('div');
    cluesContainer.className = 'crossword-clues';

    const acrossWords = words.filter(w => w.direction === 'across').sort((a, b) => a.index - b.index);
    const downWords = words.filter(w => w.direction === 'down').sort((a, b) => a.index - b.index);

    if (acrossWords.length > 0) {
      const acrossSection = document.createElement('div');
      acrossSection.className = 'clue-section';
      acrossSection.innerHTML = '<h4>Across</h4>';
      const acrossList = document.createElement('ul');
      for (const word of acrossWords) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="clue-number">${word.index}.</span> <span class="clue-category">${word.category}</span> <span class="clue-length">(${word.length})</span>`;
        acrossList.appendChild(li);
      }
      acrossSection.appendChild(acrossList);
      cluesContainer.appendChild(acrossSection);
    }

    if (downWords.length > 0) {
      const downSection = document.createElement('div');
      downSection.className = 'clue-section';
      downSection.innerHTML = '<h4>Down</h4>';
      const downList = document.createElement('ul');
      for (const word of downWords) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="clue-number">${word.index}.</span> <span class="clue-category">${word.category}</span> <span class="clue-length">(${word.length})</span>`;
        downList.appendChild(li);
      }
      downSection.appendChild(downList);
      cluesContainer.appendChild(downSection);
    }

    layout.appendChild(cluesContainer);
  }

  solutionGridEl.appendChild(layout);
  solutionContainer.classList.remove('hidden');
}

function hideSolutionGrid() {
  solutionContainer.classList.add('hidden');
  solutionGridEl.innerHTML = '';
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
    recordWin();
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

  // Show solution grid for losers and ties
  if ((!isWinner || isTie) && state.grid && result.solution) {
    renderSolutionGrid(state.grid, result.solution, state.grid.words);
  } else {
    hideSolutionGrid();
  }
}

function updateRematchStatus(state: GameState) {
  if (state.waitingForRematch) {
    if (state.opponentWantsRematch) {
      // Both want rematch - game should restart automatically
      rematchStatus.textContent = 'Starting new game...';
      rematchStatus.classList.remove('hidden');
      rematchStatus.classList.add('waiting');
    } else {
      rematchStatus.textContent = 'Waiting for opponent...';
      rematchStatus.classList.remove('hidden');
      rematchStatus.classList.add('waiting');
    }
    playAgainBtn.disabled = true;
  } else if (state.opponentWantsRematch) {
    rematchStatus.textContent = 'Opponent wants to play again!';
    rematchStatus.classList.remove('hidden', 'waiting');
    playAgainBtn.disabled = false;
  } else {
    rematchStatus.classList.add('hidden');
    rematchStatus.classList.remove('waiting');
    playAgainBtn.disabled = false;
  }
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
  const errorEl = input.closest('.word-input-wrapper')?.querySelector('.word-error') as HTMLElement;

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

  // Check if valid categorized word (we only allow words with known categories)
  if (!validWords.has(word)) {
    setError('Not in puzzle dictionary');
    return false;
  }

  clearError();
  return true;
}

// Player ID system
function generatePlayerId(): string {
  return humanId({ separator: '-', capitalize: false, adjectiveCount: 1 });
}

function loadPlayerId(): string {
  const stored = localStorage.getItem('crossfire-player-id');
  if (stored) {
    return stored;
  }
  const newId = generatePlayerId();
  localStorage.setItem('crossfire-player-id', newId);
  // Register the new player in the cloud
  registerPlayer(newId);
  return newId;
}

async function registerPlayer(playerId: string): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/player/${playerId}/register`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to register player:', error);
  }
}

function savePlayerId(id: string): void {
  localStorage.setItem('crossfire-player-id', id);
  currentPlayerId = id;
}

function updatePlayerIdDisplay(): void {
  playerIdEl.textContent = currentPlayerId;
}

function initPlayerIdUI(): void {
  changeIdBtn.addEventListener('click', () => {
    playerIdDisplay.classList.add('hidden');
    changeIdForm.classList.remove('hidden');
    newIdInput.value = '';
    newIdInput.focus();
  });

  cancelIdBtn.addEventListener('click', () => {
    changeIdForm.classList.add('hidden');
    playerIdDisplay.classList.remove('hidden');
  });

  saveIdBtn.addEventListener('click', async () => {
    const newId = newIdInput.value.trim().toLowerCase();
    if (newId) {
      // Validate that the player ID exists
      try {
        const response = await fetch(`${getApiUrl()}/api/player/${newId}/stats`);
        if (response.ok) {
          const data = await response.json();
          if (!data.exists) {
            showError('Player ID not found. You can only use an existing ID.');
            return;
          }
          savePlayerId(newId);
          updatePlayerIdDisplay();
          displayStats(data.wins);
        } else {
          showError('Failed to verify player ID');
          return;
        }
      } catch (error) {
        console.error('Failed to verify player ID:', error);
        showError('Failed to verify player ID');
        return;
      }
    }
    changeIdForm.classList.add('hidden');
    playerIdDisplay.classList.remove('hidden');
  });

  newIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveIdBtn.click();
    } else if (e.key === 'Escape') {
      cancelIdBtn.click();
    }
  });
}

// API helpers
function getApiUrl(): string {
  const isProduction = window.location.hostname !== 'localhost';
  return isProduction
    ? 'https://crossfire-worker.joelstevick.workers.dev'
    : 'http://localhost:8787';
}

// Level system
// Quadratic progression: level L requires (L-1)² total wins
// Level 1: 0 wins, Level 2: 1 win, Level 3: 4 wins, Level 4: 9 wins, etc.
function calculateLevel(wins: number): number {
  return Math.floor(Math.sqrt(wins)) + 1;
}

function winsForLevel(level: number): number {
  return (level - 1) * (level - 1);
}

function winsToNextLevel(wins: number): number {
  const currentLevel = calculateLevel(wins);
  const winsNeededForNext = winsForLevel(currentLevel + 1);
  return winsNeededForNext - wins;
}

async function fetchWins(): Promise<number> {
  try {
    const response = await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/stats`);
    if (response.ok) {
      const data = await response.json();
      return data.wins || 0;
    }
  } catch (error) {
    console.error('Failed to fetch wins:', error);
  }
  return 0;
}

async function fetchOpponentLevel(opponentName: string): Promise<number> {
  // The opponent name is used as the player ID (lowercase)
  const opponentId = opponentName.toLowerCase();
  try {
    const response = await fetch(`${getApiUrl()}/api/player/${opponentId}/stats`);
    if (response.ok) {
      const data = await response.json();
      const wins = data.wins || 0;
      const level = calculateLevel(wins);
      opponentLevelEl.textContent = String(level);
      return level;
    } else {
      opponentLevelEl.textContent = '1';
      return 1;
    }
  } catch (error) {
    console.error('Failed to fetch opponent level:', error);
    opponentLevelEl.textContent = '1';
    return 1;
  }
}

function displayStats(wins: number): void {
  const level = calculateLevel(wins);
  const toNext = winsToNextLevel(wins);

  playerLevelEl.textContent = String(level);
  playerWinsEl.textContent = String(wins);
  winsLabelEl.textContent = wins === 1 ? 'win' : 'wins';
  winsToNextEl.textContent = String(toNext);
}

async function updatePlayerStats(): Promise<void> {
  const wins = await fetchWins();
  displayStats(wins);
}

async function recordWin(): Promise<void> {
  // Prevent duplicate win recording for the same game
  if (winRecordedForCurrentGame) {
    console.log('Win already recorded for this game, skipping');
    return;
  }
  winRecordedForCurrentGame = true;

  try {
    const response = await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/record-win`, {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      displayStats(data.wins);
    }
  } catch (error) {
    console.error('Failed to record win:', error);
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('crossfire-theme');
  // Default to dark mode if no preference saved
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('crossfire-theme', isLight ? 'light' : 'dark');
}

// Initialize theme before app to avoid flash
initTheme();

// Initialize player ID first (needed for stats)
currentPlayerId = loadPlayerId();
updatePlayerIdDisplay();
initPlayerIdUI();

// Initialize player stats (fetches from cloud)
updatePlayerStats();

// Initialize app
init();
console.log('Crossfire initialized');
