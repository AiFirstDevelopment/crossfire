import './style.css';
import { GameClient, GameState } from './game';
import { CrosswordUI } from './crossword-ui';
import { BotGame, BotGameState } from './bot';
import englishWords from 'an-array-of-english-words';
import humanId from 'human-id';
import { getCategorizedWords, getHint as getWordCategory, stemToken } from '../../shared/dictionary/get-hint';
import { botWords as easyBotWords } from '../../shared/dictionary/bot.words';

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
const cancelMatchmakingBtn = document.getElementById('cancel-matchmaking-btn') as HTMLButtonElement;
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
const leaveRoomBtn = document.getElementById('leave-room-btn') as HTMLButtonElement;
const backToMenuBtn = document.getElementById('back-to-menu-btn') as HTMLButtonElement;
const leaveWaitingBtn = document.getElementById('leave-waiting-btn') as HTMLButtonElement;
const shareLinkInput = document.getElementById('share-link-input') as HTMLInputElement;
const copyLinkBtn = document.getElementById('copy-link-btn') as HTMLButtonElement;
const copyFeedback = document.getElementById('copy-feedback')!;
const leaveSubmitBtn = document.getElementById('leave-submit-btn') as HTMLButtonElement;
const leaveSolveBtn = document.getElementById('leave-solve-btn') as HTMLButtonElement;
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

// Engagement feature elements
const streakDisplay = document.getElementById('streak-display')!;
const winStreakEl = document.getElementById('win-streak')!;
const dailyStreakEl = document.getElementById('daily-streak')!;
const dailyChallengeEl = document.getElementById('daily-challenge')!;
const dailyChallengeDescEl = document.getElementById('daily-challenge-desc')!;
const dailyChallengeBarEl = document.getElementById('daily-challenge-bar')!;
const dailyChallengeStatusEl = document.getElementById('daily-challenge-status')!;
const leaderboardListEl = document.getElementById('leaderboard-list')!;
const playerRankDisplayEl = document.getElementById('player-rank-display')!;
const playerRankEl = document.getElementById('player-rank')!;
const playerWeeklyWinsEl = document.getElementById('player-weekly-wins')!;
const achievementsListEl = document.getElementById('achievements-list')!;
const resultStreakDisplayEl = document.getElementById('result-streak-display')!;
const newAchievementsEl = document.getElementById('new-achievements')!;
const dailyChallengeCompleteEl = document.getElementById('daily-challenge-complete')!;
const confettiContainer = document.getElementById('confetti-container')!;
const achievementToast = document.getElementById('achievement-toast')!;
const achievementTextEl = document.getElementById('achievement-text')!;
const streakToast = document.getElementById('streak-toast')!;
const streakTextEl = document.getElementById('streak-text')!;

// Maintenance banner elements
const maintenanceBanner = document.getElementById('maintenance-banner')!;
const maintenanceTime = document.getElementById('maintenance-time')!;

// Challenge a friend elements
const friendBattlesCountEl = document.getElementById('friend-battles-count')!;
const headToHeadEl = document.getElementById('head-to-head')!;
const h2hOpponentEl = document.getElementById('h2h-opponent')!;
const h2hRecordEl = document.getElementById('h2h-record')!;
const challengePromptEl = document.getElementById('challenge-prompt')!;
const challengeFriendBtn = document.getElementById('challenge-friend-btn') as HTMLButtonElement;

// H2H history modal elements
const viewH2HBtn = document.getElementById('view-h2h-btn') as HTMLButtonElement;
const h2hModal = document.getElementById('h2h-modal')!;
const h2hListEl = document.getElementById('h2h-list')!;
const h2hCloseBtn = document.getElementById('h2h-close-btn') as HTMLButtonElement;

// Rematch elements
const rematchSection = document.getElementById('rematch-section')!;
const rematchBtn = document.getElementById('rematch-btn') as HTMLButtonElement;
const rematchStatus = document.getElementById('rematch-status')!;
const rematchRequest = document.getElementById('rematch-request')!;
const acceptRematchBtn = document.getElementById('accept-rematch-btn') as HTMLButtonElement;
const declineRematchBtn = document.getElementById('decline-rematch-btn') as HTMLButtonElement;

// Rematch modal elements
const rematchModal = document.getElementById('rematch-modal')!;
const modalAcceptBtn = document.getElementById('modal-accept-btn') as HTMLButtonElement;
const modalDeclineBtn = document.getElementById('modal-decline-btn') as HTMLButtonElement;

let currentPlayerId: string = '';


// Track previous stats for achievement detection
let previousAchievements: string[] = [];
let previousWinStreak = 0;
let previousDailyChallengeCompleted = false;

let game: GameClient;
let botGame: BotGame | null = null;
let crosswordUI: CrosswordUI | null = null;
let timerInterval: number | null = null;
let lastSubmittedWords: string[] = []; // Store words for resubmit scenarios
let accumulatedPenalty = 0;
let isBotMode = false;
let botGameActive = false; // Track if bot game is active for game count
let winRecordedForCurrentGame = false; // Prevent duplicate win recording
let currentOpponentName: string | null = null; // Track current opponent for h2h

// Maintenance state
let maintenanceCheckStarted = false;

// Handle submission timeout - auto-leave the game
function handleSubmissionTimeout() {
  if (isBotMode && botGame) {
    botGame.destroy();
    botGame = null;
    isBotMode = false;
    botGameActive = false;
    updateActivePlayers(game.getState().activePlayers);
  } else {
    game.leaveRoom();
  }
  lastSubmittedWords = [];
  showScreen('menu');
  window.scrollTo(0, 0);
  findMatchBtn.disabled = false;
  statusText.textContent = 'Time expired - returned to menu';
}

// Handle real-time leaderboard updates from WebSocket
function handleLeaderboardUpdate(leaderboard: Array<{ rank: number; playerId: string; wins: number }>) {
  displayLeaderboard(leaderboard, null, 0);
}

// Handle maintenance warning from WebSocket
function handleMaintenanceWarning(_countdownSeconds: number, _version: string, scheduledAt: number) {
  // Prevent duplicate handling
  if (maintenanceCheckStarted) return;
  maintenanceCheckStarted = true;

  // Format the scheduled time in user's local timezone
  const scheduledDate = new Date(scheduledAt);
  const timeStr = scheduledDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  maintenanceTime.textContent = timeStr;

  // Show the maintenance banner
  maintenanceBanner.classList.remove('hidden');

  // Start checking for new version immediately
  startVersionCheck();
}

// Check for new version and reload when ready
function startVersionCheck() {
  const checkVersion = async () => {
    try {
      // Fetch the index.html to check for new version
      const response = await fetch('/?v=' + Date.now(), { cache: 'no-store' });
      const html = await response.text();

      // Check if the version in the HTML has changed
      const versionMatch = html.match(/title="Version: ([^"]+)"/);
      const currentVersion = document.getElementById('logo')?.getAttribute('title')?.replace('Version: ', '');

      if (versionMatch && versionMatch[1] !== currentVersion) {
        // New version detected, reload
        window.location.reload();
        return;
      }
    } catch (e) {
      console.log('Version check failed:', e);
    }

    // Keep checking every 5 seconds until new version is detected
    setTimeout(checkVersion, 5000);
  };

  checkVersion();
}

function init() {
  game = new GameClient();
  game.setPlayerId(currentPlayerId);

  game.onStateChange(handleStateChange);
  game.onHintUsed(showHintUsed);
  game.onMatchmakingTimeout(startBotGame);
  game.onLeaderboardUpdate(handleLeaderboardUpdate);
  game.onMaintenanceWarning(handleMaintenanceWarning);

  findMatchBtn.addEventListener('click', () => {
    findMatchBtn.disabled = true;
    statusText.textContent = 'Finding match...';
    cancelMatchmakingBtn.classList.remove('hidden');
    game.findMatch();
  });

  cancelMatchmakingBtn.addEventListener('click', () => {
    game.cancelMatchmaking();
    cancelMatchmakingBtn.classList.add('hidden');
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  // Disable join room button when input is empty
  joinRoomBtn.disabled = true;
  roomIdInput.addEventListener('input', () => {
    joinRoomBtn.disabled = !roomIdInput.value.trim();
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

  leaveRoomBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      // Update active games count (removes bot game addition)
      updateActivePlayers(game.getState().activePlayers);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    crosswordUI = null;
    hideSolutionGrid();
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
    // Auto-start new matchmaking after a brief delay
    setTimeout(() => {
      findMatchBtn.click();
    }, 100);
  });

  backToMenuBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      updateActivePlayers(game.getState().activePlayers);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    crosswordUI = null;
    hideSolutionGrid();
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
    // No auto-matchmaking - just return to menu
  });

  leaveWaitingBtn.addEventListener('click', () => {
    game.leaveRoom();
    clearRoomFromUrl();
    roomIdInput.value = '';
    joinRoomBtn.disabled = true;
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  // Copy share link button
  copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    }).catch(() => {
      // Fallback for older browsers
      document.execCommand('copy');
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    });
  });

  // Challenge a friend button (on results screen after bot games)
  challengeFriendBtn.addEventListener('click', () => {
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
    // Focus the room input to encourage creating a friend room
    roomIdInput.focus();
  });

  // Rematch button handlers
  rematchBtn.addEventListener('click', () => {
    // Show waiting UI (same experience for bot and multiplayer)
    rematchBtn.disabled = true;
    rematchBtn.textContent = 'Waiting...';
    rematchStatus.textContent = 'Waiting for opponent to accept...';
    rematchStatus.classList.remove('hidden');

    if (isBotMode) {
      // Bot "thinks" for 5 seconds then auto-accepts
      setTimeout(() => {
        restartBotGame();
      }, 5000);
    } else {
      // Multiplayer - request rematch from opponent
      game.playAgain();
    }
  });

  acceptRematchBtn.addEventListener('click', () => {
    rematchModal.classList.add('hidden');
    game.playAgain();
  });

  declineRematchBtn.addEventListener('click', () => {
    rematchModal.classList.add('hidden');
    game.leaveRoom();
    clearRoomFromUrl();
    roomIdInput.value = '';
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  // Modal rematch button handlers
  modalAcceptBtn.addEventListener('click', () => {
    rematchModal.classList.add('hidden');
    game.playAgain();
  });

  modalDeclineBtn.addEventListener('click', () => {
    rematchModal.classList.add('hidden');
    game.leaveRoom();
    clearRoomFromUrl();
    roomIdInput.value = '';
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  leaveSubmitBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      updateActivePlayers(game.getState().activePlayers);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  leaveSolveBtn.addEventListener('click', () => {
    if (isBotMode && botGame) {
      botGame.destroy();
      botGame = null;
      isBotMode = false;
      botGameActive = false;
      updateActivePlayers(game.getState().activePlayers);
    } else {
      game.leaveRoom();
    }
    lastSubmittedWords = [];
    crosswordUI = null;
    hideSolutionGrid();
    showScreen('menu');
    window.scrollTo(0, 0);
    findMatchBtn.disabled = false;
    statusText.textContent = '';
  });

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // H2H history modal
  viewH2HBtn.addEventListener('click', showH2HModal);
  h2hCloseBtn.addEventListener('click', () => {
    h2hModal.classList.add('hidden');
  });
  // Close modal when clicking outside
  h2hModal.addEventListener('click', (e) => {
    if (e.target === h2hModal) {
      h2hModal.classList.add('hidden');
    }
  });
}

// Start a bot game when matchmaking times out
function startBotGame() {
  // Cancel the real matchmaking
  game.cancelMatchmaking();
  cancelMatchmakingBtn.classList.add('hidden');

  // Create bot game
  isBotMode = true;
  botGameActive = true;
  botGame = new BotGame(validWords, wordList);
  botGame.onStateChange(handleBotStateChange);
  botGame.onHintUsed(showHintUsed);

  // Update active games count (adds 1 for bot game)
  updateActivePlayers(game.getState().activePlayers);

  // Update status text
  statusText.textContent = `Playing against ${botGame.getBotName()}`;

  // Trigger initial state change to show the submit screen
  // (constructor sets state before handler is registered)
  handleBotStateChange(botGame.getState());
}

// Restart a bot game (for rematch - bot auto-accepts)
function restartBotGame() {
  // Create new bot game
  botGame = new BotGame(validWords, wordList);
  botGame.onStateChange(handleBotStateChange);
  botGame.onHintUsed(showHintUsed);

  // Update status text
  statusText.textContent = `Playing against ${botGame.getBotName()}`;

  // Trigger initial state change to show the submit screen
  handleBotStateChange(botGame.getState());
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
      startTimer(state.submissionTimeoutMs, state.phaseStartedAt, timerSubmit, handleSubmissionTimeout);
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
        // Start timer only once when entering solve phase
        startTimer(state.solvingTimeoutMs, state.phaseStartedAt, timerSolve);
      } else if (crosswordUI) {
        crosswordUI.update(state.playerFilledCells, state.playerCellCorrectness);
      }
      updateBotProgress(state);
      break;

    case 'finished':
      showScreen('results');
      stopTimer();
      showBotResults(state);
      crosswordUI = null;
      // Show rematch UI for bot games (pass empty state, isBotMode handles the rest)
      updateRematchUI({} as GameState);
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

  // Hide h2h (only for multiplayer), rematch UI handled by updateRematchUI()
  headToHeadEl.classList.add('hidden');
  challengePromptEl.classList.add('hidden');
  currentOpponentName = null; // Reset for next game

  if (isTie) {
    resultTitle.textContent = "It's a Tie!";
  } else if (isWinner) {
    resultTitle.textContent = 'You Win!';
    recordWin(state.hintsUsed, result.yourTime, false); // Bot game
  } else {
    resultTitle.textContent = 'Your opponent Wins!';
    recordLoss();
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
  updateActivePlayers(state.activePlayers);
  updateTotalGames(state.totalGamesPlayed);
  updateTotalPlayers(state.totalPlayers, state.returningUsers);

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
  // Skip screen updates if we're in bot mode (bot game handles its own screens)
  // BUT: if a real multiplayer game starts (has roomId and opponent), reset bot mode
  if (isBotMode && state.roomId && state.opponentName) {
    isBotMode = false;
  }
  if (isBotMode) return;

  switch (state.phase) {
    case 'connecting':
      // Only show menu if there's an error (connection rejection)
      // Otherwise, we're in the middle of connecting - don't change screens
      if (state.error) {
        cancelMatchmakingBtn.classList.add('hidden');
        showScreen('menu');
        window.scrollTo(0, 0);
      }
      break;

    case 'matchmaking':
      cancelMatchmakingBtn.classList.remove('hidden');
      statusText.textContent = 'In queue, waiting for opponent...';
      break;

    case 'waiting':
      cancelMatchmakingBtn.classList.add('hidden');
      showScreen('waiting');
      waitingInfo.textContent = 'Waiting for opponent...';
      // Update share link with current room ID
      if (state.roomId) {
        updateShareLink(state.roomId);
      }
      break;

    case 'submitting':
      cancelMatchmakingBtn.classList.add('hidden');
      rematchModal.classList.add('hidden'); // Hide modal when starting new game
      // Reset win tracking for new game
      winRecordedForCurrentGame = false;
      // Reset bot mode - this is a real multiplayer game
      isBotMode = false;
      showScreen('submit');
      submitFormSection.classList.remove('hidden');
      submitWaitingSection.classList.add('hidden');
      // Show opponent info on submit screen
      if (state.opponentName) {
        currentOpponentName = state.opponentName; // Track for h2h
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
      startTimer(state.submissionTimeoutMs, state.phaseStartedAt, timerSubmit, handleSubmissionTimeout);
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
        // Start timer only once when entering solve phase
        startTimer(state.solvingTimeoutMs, state.phaseStartedAt, timerSolve);
      } else if (crosswordUI) {
        crosswordUI.update(state.filledCells, state.cellCorrectness);
      }
      updateProgress(state);
      break;

    case 'finished':
      // Check if we're already on results screen (opponent left while viewing results)
      const alreadyOnResults = !screens.results.classList.contains('hidden');

      if (state.opponentLeftAfterGame && alreadyOnResults) {
        // Just update the rematch UI and show notification - don't navigate away
        updateRematchUI(state);
        showInfo('Opponent has left the room');
        break;
      }

      showScreen('results');
      stopTimer();
      showResults(state);
      crosswordUI = null;
      // Update rematch UI based on state
      updateRematchUI(state);
      break;
  }
}

function showScreen(name: keyof typeof screens) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');

  // Load AdSense ad when showing results screen
  if (name === 'results') {
    loadResultsAd();
  }

  // Update friend battles count when showing menu
  if (name === 'menu') {
    displayFriendBattlesCount();
  }
}

// Load AdSense ad on results screen
function loadResultsAd() {
  // Only load ad if user has consented to ads
  const consent = localStorage.getItem('crossfire-cookie-consent');
  if (consent !== 'all') return;

  try {
    const adContainer = document.getElementById('results-ad-container');
    if (adContainer) {
      // Clear previous ad and create fresh ins element
      adContainer.innerHTML = `
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-9275404280127308"
             data-ad-slot="6942531764"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      `;
      // Push ad request
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({});
    }
  } catch (e) {
    console.log('AdSense not loaded');
  }
}

function updateActivePlayers(serverCount: number) {
  // Add 1 to server count if a bot game is active (backend already applies baseline)
  const count = botGameActive ? serverCount + 1 : serverCount;
  const plural = count === 1 ? 'player' : 'players';
  activeGamesEl.textContent = `${count} ${plural} active`;
}

function updateTotalGames(count: number) {
  totalGamesEl.textContent = `${count.toLocaleString()} games played`;
}

function updateTotalPlayers(count: number, returning: number) {
  totalPlayersEl.textContent = `Players: ${count.toLocaleString()}`;
  if (returning > 0) {
    totalPlayersEl.title = `${returning.toLocaleString()} returning`;
  } else {
    totalPlayersEl.title = '';
  }
}

// URL helper functions for shareable room links
function getRoomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

function clearRoomFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState({}, '', url.pathname + url.search);
}

function generateShareLink(roomId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  // Remove any hash and just return the clean URL
  return url.origin + url.pathname + '?room=' + encodeURIComponent(roomId);
}

function updateShareLink(roomId: string): void {
  const link = generateShareLink(roomId);
  shareLinkInput.value = link;
}

function showError(message: string) {
  errorToast.textContent = message;
  errorToast.classList.remove('hidden');
  errorToast.classList.remove('info-toast');
  setTimeout(() => errorToast.classList.add('hidden'), 5000);
}

function showInfo(message: string) {
  errorToast.textContent = message;
  errorToast.classList.add('info-toast');
  errorToast.classList.remove('hidden');
  setTimeout(() => {
    errorToast.classList.add('hidden');
    errorToast.classList.remove('info-toast');
  }, 4000);
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

function startTimer(durationMs: number, startedAt: number, element: HTMLElement, onExpire?: () => void) {
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

    // When timer expires, call the callback and stop the timer
    if (remaining === 0 && onExpire) {
      stopTimer();
      onExpire();
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

function updateRematchUI(state: GameState) {
  // Show rematch section
  rematchSection.classList.remove('hidden');

  // For bot games, show "Rematch" button (same as multiplayer - bot auto-accepts after 5s)
  if (isBotMode) {
    challengePromptEl.classList.add('hidden'); // Hide challenge prompt, show rematch instead
    rematchModal.classList.add('hidden');
    rematchBtn.disabled = false;
    rematchBtn.textContent = 'Rematch';
    rematchBtn.classList.remove('hidden');
    rematchStatus.classList.add('hidden');
    rematchRequest.classList.add('hidden');
    return;
  }

  // Check if opponent left (either after game or during game causing 'opponent-left' win reason)
  const opponentLeft = state.opponentLeftAfterGame || state.result?.winReason === 'opponent-left';

  if (opponentLeft) {
    // Opponent left/declined - hide rematch options and modal, show message
    rematchModal.classList.add('hidden');
    rematchBtn.classList.add('hidden');
    rematchRequest.classList.add('hidden');
    rematchStatus.textContent = 'Opponent has left the room';
    rematchStatus.classList.remove('hidden');
  } else if (state.opponentWantsRematch) {
    // Opponent wants rematch - show modal
    rematchModal.classList.remove('hidden');
    rematchBtn.classList.add('hidden');
    rematchStatus.classList.add('hidden');
    rematchRequest.classList.remove('hidden');
  } else if (state.waitingForRematch) {
    // We're waiting for opponent
    rematchModal.classList.add('hidden');
    rematchBtn.disabled = true;
    rematchBtn.textContent = 'Waiting...';
    rematchBtn.classList.remove('hidden');
    rematchStatus.textContent = 'Waiting for opponent to accept...';
    rematchStatus.classList.remove('hidden');
    rematchRequest.classList.add('hidden');
  } else {
    // Initial state - show rematch button
    rematchModal.classList.add('hidden');
    rematchBtn.disabled = false;
    rematchBtn.textContent = 'Rematch';
    rematchBtn.classList.remove('hidden');
    rematchStatus.classList.add('hidden');
    rematchRequest.classList.add('hidden');
  }
}

function showResults(state: GameState) {
  const result = state.result;
  if (!result) return;

  const isWinner = result.winnerId === state.playerId;
  const isTie = result.winReason === 'tie';

  // Get hints used from accumulated penalty (15s per hint = 15000ms)
  const hintsUsed = Math.round(accumulatedPenalty / 15000);

  // Hide challenge prompt (only shown for bot games)
  challengePromptEl.classList.add('hidden');

  // Display head-to-head record for multiplayer games (server updates h2h automatically)
  if (currentOpponentName) {
    const opponentId = currentOpponentName.toLowerCase();
    displayH2HRecord(opponentId, currentOpponentName);
  } else {
    headToHeadEl.classList.add('hidden');
  }

  if (isTie) {
    resultTitle.textContent = "It's a Tie!";
  } else if (isWinner) {
    resultTitle.textContent = 'You Win!';
    recordWin(hintsUsed, result.yourTime);
  } else {
    resultTitle.textContent = 'You Lose';
    recordLoss();
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

// Record a visit (for returning user tracking)
async function recordVisit(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/visit`, {
      method: 'POST',
    });
  } catch (error) {
    // Silently fail - visit tracking is non-critical
  }
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

async function recordWin(hintsUsed: number = 0, timeMs: number = 0, isMultiplayer: boolean = true): Promise<void> {
  // Prevent duplicate win recording for the same game
  if (winRecordedForCurrentGame) {
    console.log('Win already recorded for this game, skipping');
    return;
  }
  winRecordedForCurrentGame = true;

  try {
    const response = await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/record-win`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hintsUsed, timeMs, isMultiplayer }),
    });
    if (response.ok) {
      const data = await response.json();
      displayStats(data.wins);

      // Show engagement features (confetti, achievements, streaks)
      showResultsWithEngagement(true, data);

      // Update engagement UI in menu
      displayStreaks(data);
      displayDailyChallenge(data);
      displayAchievements(data.achievements || []);

      // Refresh leaderboard
      fetchLeaderboard();
    }
  } catch (error) {
    console.error('Failed to record win:', error);
  }
}

async function recordLoss(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/record-loss`, {
      method: 'POST',
    });

    // Refresh stats to update streaks etc
    const stats = await fetchEngagementStats();
    if (stats) {
      displayStreaks(stats);
      displayDailyChallenge(stats);
      showResultsWithEngagement(false, stats);
    }
  } catch (error) {
    console.error('Failed to record loss:', error);
  }
}

// ============== HEAD-TO-HEAD TRACKING (SERVER-SIDE) ==============

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  lastPlayed: number;
}

// Cache for server-side h2h records
let cachedH2HRecords: Record<string, HeadToHeadRecord> = {};
let h2hRecordsFetched = false;

async function fetchH2HRecords(): Promise<Record<string, HeadToHeadRecord>> {
  if (!currentPlayerId) return {};

  try {
    const response = await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/h2h`);
    if (response.ok) {
      cachedH2HRecords = await response.json();
      h2hRecordsFetched = true;
    }
  } catch (error) {
    console.error('Failed to fetch h2h records:', error);
  }
  return cachedH2HRecords;
}

function getH2HRecords(): Record<string, HeadToHeadRecord> {
  return cachedH2HRecords;
}

async function displayH2HRecord(opponentId: string, opponentName: string): Promise<void> {
  // Fetch latest h2h records from server
  await fetchH2HRecords();

  const normalizedId = opponentId.toLowerCase();
  const record = cachedH2HRecords[normalizedId];

  if (record && (record.wins > 0 || record.losses > 0)) {
    h2hOpponentEl.textContent = opponentName;
    h2hRecordEl.textContent = `${record.wins}W - ${record.losses}L`;
    headToHeadEl.classList.remove('hidden');
  } else {
    headToHeadEl.classList.add('hidden');
  }
}

function getTotalFriendBattles(): number {
  const records = getH2HRecords();
  let total = 0;
  for (const record of Object.values(records)) {
    total += record.wins + record.losses;
  }
  return total;
}

async function displayFriendBattlesCount(): Promise<void> {
  // Ensure we have latest records
  if (!h2hRecordsFetched) {
    await fetchH2HRecords();
  }

  const total = getTotalFriendBattles();
  if (total > 0) {
    friendBattlesCountEl.textContent = `${total} friend ${total === 1 ? 'battle' : 'battles'} played`;
    friendBattlesCountEl.classList.remove('hidden');
  } else {
    friendBattlesCountEl.classList.add('hidden');
  }
  // Always show "View history" button - modal shows empty state message if no battles
  viewH2HBtn.classList.remove('hidden');
}

function showH2HModal(): void {
  const records = getH2HRecords();
  const entries = Object.values(records).sort((a, b) => b.lastPlayed - a.lastPlayed);

  h2hListEl.innerHTML = '';

  if (entries.length === 0) {
    h2hListEl.innerHTML = '<p class="h2h-empty">No friend battles yet. Challenge a friend to get started!</p>';
  } else {
    for (const record of entries) {
      const item = document.createElement('div');
      item.className = 'h2h-item';
      item.innerHTML = `
        <span class="h2h-opponent-name">${record.opponentName}</span>
        <span class="h2h-score">${record.wins}W - ${record.losses}L</span>
      `;
      h2hListEl.appendChild(item);
    }
  }

  h2hModal.classList.remove('hidden');
}

// ============== ENGAGEMENT FEATURES ==============

// Achievement definitions (must match backend)
const ACHIEVEMENTS: Record<string, { name: string; description: string; icon: string }> = {
  first_win: { name: 'First Blood', description: 'Win your first game', icon: '🏆' },
  win_streak_3: { name: 'Hot Streak', description: 'Win 3 games in a row', icon: '🔥' },
  win_streak_5: { name: 'On Fire', description: 'Win 5 games in a row', icon: '💥' },
  win_streak_10: { name: 'Unstoppable', description: 'Win 10 games in a row', icon: '⚡' },
  daily_streak_3: { name: 'Dedicated', description: 'Play 3 days in a row', icon: '📅' },
  daily_streak_7: { name: 'Weekly Warrior', description: 'Play 7 days in a row', icon: '🗓️' },
  daily_streak_30: { name: 'Monthly Master', description: 'Play 30 days in a row', icon: '👑' },
  speed_demon: { name: 'Speed Demon', description: 'Win in under 60 seconds', icon: '⏱️' },
  perfectionist: { name: 'Perfectionist', description: 'Win without using hints', icon: '✨' },
  veteran_10: { name: 'Veteran', description: 'Win 10 games total', icon: '🎖️' },
  champion_50: { name: 'Champion', description: 'Win 50 games total', icon: '🏅' },
  legend_100: { name: 'Legend', description: 'Win 100 games total', icon: '🌟' },
};

// Daily challenge descriptions
const CHALLENGE_TYPES: Record<string, { description: (target: number) => string }> = {
  win_games: { description: (t) => `Win ${t} game${t > 1 ? 's' : ''} today` },
  play_games: { description: (t) => `Play ${t} game${t > 1 ? 's' : ''} today` },
  no_hints: { description: () => 'Win a game without using hints' },
  fast_win: { description: (t) => `Win a game in under ${t} seconds` },
};

// Fetch player stats including streaks, achievements, daily challenge
interface PlayerEngagementStats {
  wins: number;
  losses: number;
  currentWinStreak: number;
  bestWinStreak: number;
  dailyStreak: number;
  bestDailyStreak: number;
  achievements: string[];
  dailyChallengeType: string;
  dailyChallengeTarget: number;
  dailyChallengeProgress: number;
  dailyChallengeCompleted: boolean;
}

async function fetchEngagementStats(): Promise<PlayerEngagementStats | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/player/${currentPlayerId}/stats`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch engagement stats:', error);
  }
  return null;
}

// Display streaks in header
function displayStreaks(stats: PlayerEngagementStats) {
  if (stats.currentWinStreak > 0 || stats.dailyStreak > 0) {
    streakDisplay.classList.remove('hidden');

    if (stats.currentWinStreak > 0) {
      winStreakEl.textContent = `🔥 ${stats.currentWinStreak} win streak`;
      winStreakEl.classList.remove('hidden');
    } else {
      winStreakEl.classList.add('hidden');
    }

    if (stats.dailyStreak > 0) {
      dailyStreakEl.textContent = `📅 ${stats.dailyStreak} day streak`;
      dailyStreakEl.classList.remove('hidden');
    } else {
      dailyStreakEl.classList.add('hidden');
    }
  } else {
    streakDisplay.classList.add('hidden');
  }
}

// Display daily challenge
function displayDailyChallenge(stats: PlayerEngagementStats) {
  if (!stats.dailyChallengeType) {
    dailyChallengeEl.classList.add('hidden');
    return;
  }

  dailyChallengeEl.classList.remove('hidden');

  const challengeInfo = CHALLENGE_TYPES[stats.dailyChallengeType];
  if (challengeInfo) {
    dailyChallengeDescEl.textContent = challengeInfo.description(stats.dailyChallengeTarget);
  } else {
    dailyChallengeDescEl.textContent = 'Complete today\'s challenge';
  }

  const progress = stats.dailyChallengeProgress;
  const target = stats.dailyChallengeTarget;
  const percent = Math.min(100, Math.round((progress / target) * 100));

  dailyChallengeBarEl.style.width = `${percent}%`;

  if (stats.dailyChallengeCompleted) {
    dailyChallengeEl.classList.add('completed');
    dailyChallengeStatusEl.textContent = '✓ Complete!';
  } else {
    dailyChallengeEl.classList.remove('completed');
    dailyChallengeStatusEl.textContent = `${progress}/${target}`;
  }
}

// Fetch and display leaderboard
interface LeaderboardEntry {
  playerId: string;
  wins: number;
}

async function fetchLeaderboard(): Promise<void> {
  try {
    const response = await fetch(`${getApiUrl()}/api/leaderboard/weekly?playerId=${currentPlayerId}&limit=10`);
    if (response.ok) {
      const data = await response.json();
      displayLeaderboard(data.leaderboard, data.playerRank, data.playerWins);
    }
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }
}

function displayLeaderboard(entries: LeaderboardEntry[], playerRank: number | null, playerWins: number) {
  leaderboardListEl.innerHTML = '';

  if (entries.length === 0) {
    leaderboardListEl.innerHTML = '<div class="leaderboard-item"><span style="color: rgba(255,255,255,0.5)">No games played this week yet</span></div>';
    playerRankDisplayEl.classList.add('hidden');
    return;
  }

  entries.slice(0, 10).forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    if (index < 3) item.classList.add('top-3');
    if (entry.playerId === currentPlayerId) item.classList.add('current-player');

    item.innerHTML = `
      <span class="leaderboard-rank">#${index + 1}</span>
      <span class="leaderboard-name">${entry.playerId}</span>
      <span class="leaderboard-wins">${entry.wins}</span>
    `;

    leaderboardListEl.appendChild(item);
  });

  // Show player's rank if not in top 10
  if (playerRank && playerRank > 10) {
    playerRankDisplayEl.classList.remove('hidden');
    playerRankEl.textContent = `#${playerRank}`;
    playerWeeklyWinsEl.textContent = String(playerWins);
  } else if (playerRank) {
    playerRankDisplayEl.classList.remove('hidden');
    playerRankEl.textContent = `#${playerRank}`;
    playerWeeklyWinsEl.textContent = String(playerWins);
  } else {
    playerRankDisplayEl.classList.add('hidden');
  }
}

// Display achievements
function displayAchievements(unlockedAchievements: string[]) {
  achievementsListEl.innerHTML = '';

  for (const [id, info] of Object.entries(ACHIEVEMENTS)) {
    const isUnlocked = unlockedAchievements.includes(id);
    const item = document.createElement('div');
    item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
    item.innerHTML = `
      <span class="achievement-badge">${info.icon}</span>
      <span class="achievement-name">${info.name}</span>
      <span class="achievement-desc">${info.description}</span>
    `;
    achievementsListEl.appendChild(item);
  }
}

// Show confetti celebration
function showConfetti() {
  confettiContainer.classList.remove('hidden');
  confettiContainer.innerHTML = '';

  const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#ff6600', '#646cff'];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.width = `${6 + Math.random() * 8}px`;
    confetti.style.height = `${6 + Math.random() * 8}px`;
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    confettiContainer.appendChild(confetti);
  }

  // Clean up after animation
  setTimeout(() => {
    confettiContainer.classList.add('hidden');
    confettiContainer.innerHTML = '';
  }, 4000);
}

// Show achievement toast
function showAchievementToast(achievementId: string) {
  const info = ACHIEVEMENTS[achievementId];
  if (!info) return;

  achievementTextEl.textContent = `${info.icon} ${info.name} Unlocked!`;
  achievementToast.classList.remove('hidden');

  // Play sound if available
  playSound('achievement');

  setTimeout(() => {
    achievementToast.classList.add('hidden');
  }, 4000);
}

// Show streak toast
function showStreakToast(streak: number) {
  streakTextEl.textContent = `${streak} Win Streak!`;
  streakToast.classList.remove('hidden');

  setTimeout(() => {
    streakToast.classList.add('hidden');
  }, 3000);
}

// Sound effects (disabled)
function playSound(_type: 'win' | 'lose' | 'correct' | 'achievement') {
  // All sounds disabled
}

// Show results screen with engagement features
function showResultsWithEngagement(isWinner: boolean, newStats: PlayerEngagementStats | null) {
  // Show confetti for wins
  if (isWinner) {
    showConfetti();
  } else {
    playSound('lose');
  }

  if (!newStats) return;

  // Check for new achievements
  const newAchievements = newStats.achievements.filter(a => !previousAchievements.includes(a));
  if (newAchievements.length > 0) {
    newAchievementsEl.classList.remove('hidden');
    newAchievementsEl.innerHTML = '';

    for (const achId of newAchievements) {
      const info = ACHIEVEMENTS[achId];
      if (!info) continue;

      const item = document.createElement('div');
      item.className = 'new-achievement-item';
      item.innerHTML = `
        <span class="new-achievement-icon">${info.icon}</span>
        <div class="new-achievement-info">
          <div class="new-achievement-name">${info.name}</div>
          <div class="new-achievement-desc">${info.description}</div>
        </div>
      `;
      newAchievementsEl.appendChild(item);

      // Show toast for first new achievement
      if (newAchievements.indexOf(achId) === 0) {
        setTimeout(() => showAchievementToast(achId), 500);
      }
    }
  } else {
    newAchievementsEl.classList.add('hidden');
  }

  // Show win streak on results
  if (isWinner && newStats.currentWinStreak >= 2) {
    resultStreakDisplayEl.classList.remove('hidden');
    resultStreakDisplayEl.innerHTML = `
      <div class="result-streak-badge win-streak">🔥 ${newStats.currentWinStreak} Win Streak!</div>
    `;

    // Show streak toast if it increased
    if (newStats.currentWinStreak > previousWinStreak && newStats.currentWinStreak >= 3) {
      setTimeout(() => showStreakToast(newStats.currentWinStreak), 1000);
    }
  } else {
    resultStreakDisplayEl.classList.add('hidden');
  }

  // Show daily challenge completion
  if (newStats.dailyChallengeCompleted && !previousDailyChallengeCompleted) {
    dailyChallengeCompleteEl.classList.remove('hidden');
  } else {
    dailyChallengeCompleteEl.classList.add('hidden');
  }

  // Update previous state for next comparison
  previousAchievements = [...newStats.achievements];
  previousWinStreak = newStats.currentWinStreak;
  previousDailyChallengeCompleted = newStats.dailyChallengeCompleted;
}


// Initialize all engagement features
async function initEngagementFeatures() {
  const stats = await fetchEngagementStats();

  if (stats) {
    // Store initial state for comparison
    previousAchievements = stats.achievements || [];
    previousWinStreak = stats.currentWinStreak || 0;
    previousDailyChallengeCompleted = stats.dailyChallengeCompleted || false;

    // Display all engagement UI
    displayStreaks(stats);
    displayDailyChallenge(stats);
    displayAchievements(stats.achievements || []);
  }

  // Fetch leaderboard
  await fetchLeaderboard();
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

// Record visit for returning user tracking
recordVisit();

// Initialize engagement features (streaks, leaderboard, achievements, daily challenges)
initEngagementFeatures();

// Initialize friend battles display (shows "View history" button)
displayFriendBattlesCount();

// Initialize app
init();

// Check for room ID in URL and auto-join if present
const roomFromUrl = getRoomFromUrl();
if (roomFromUrl) {
  // Track that a shared link was clicked (fire-and-forget)
  fetch(`${getApiUrl()}/api/shared-link-clicked`, { method: 'POST' }).catch(() => {});

  // Small delay to ensure WebSocket is connected
  setTimeout(() => {
    roomIdInput.value = roomFromUrl;
    game.connectToRoom(roomFromUrl);
  }, 500);
}

// ============== COOKIE CONSENT ==============

type CookieConsent = 'all' | 'essential' | null;

function getCookieConsent(): CookieConsent {
  const consent = localStorage.getItem('crossfire-cookie-consent');
  if (consent === 'all' || consent === 'essential') {
    return consent;
  }
  return null;
}

function setCookieConsent(consent: 'all' | 'essential'): void {
  localStorage.setItem('crossfire-cookie-consent', consent);
  localStorage.setItem('crossfire-cookie-consent-date', new Date().toISOString());
}

function initCookieConsent(): void {
  const banner = document.getElementById('cookie-consent');
  const acceptAllBtn = document.getElementById('cookie-accept-all');
  const essentialBtn = document.getElementById('cookie-essential');

  if (!banner || !acceptAllBtn || !essentialBtn) return;

  const consent = getCookieConsent();

  // Show banner if no consent given
  if (!consent) {
    banner.classList.remove('hidden');
  }

  // Handle Accept All
  acceptAllBtn.addEventListener('click', () => {
    setCookieConsent('all');
    banner.classList.add('hidden');
    // Enable analytics/ads (Google Tag is already loaded, this just records consent)
    console.log('Cookie consent: all cookies accepted');
  });

  // Handle Essential Only
  essentialBtn.addEventListener('click', () => {
    setCookieConsent('essential');
    banner.classList.add('hidden');
    // Disable non-essential tracking
    disableNonEssentialTracking();
    console.log('Cookie consent: essential only');
  });

  // If user previously chose essential only, disable tracking
  if (consent === 'essential') {
    disableNonEssentialTracking();
  }
}

function disableNonEssentialTracking(): void {
  // Disable Google Analytics/Ads tracking
  // This sets a flag that gtag respects
  (window as unknown as { [key: string]: unknown })['ga-disable-AW-17918914377'] = true;

  // Optionally delete existing cookies (for GDPR compliance)
  // Note: This won't delete HttpOnly cookies set by third parties
  const cookiesToDelete = ['_ga', '_gid', '_gat', '_gcl_au'];
  cookiesToDelete.forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

// Initialize cookie consent banner
initCookieConsent();

console.log('Crossfire initialized');

// Dev helper: trigger maintenance banner from console
// Usage: window.testMaintenance()
(window as unknown as { testMaintenance: () => void }).testMaintenance = () => {
  console.log('testMaintenance called');
  console.log('maintenanceBanner element:', maintenanceBanner);
  console.log('maintenanceCheckStarted:', maintenanceCheckStarted);

  // Reset the flag so we can test multiple times
  maintenanceCheckStarted = false;

  const scheduledAt = Date.now() + 180000; // 3 minutes from now
  handleMaintenanceWarning(180, 'test-version', scheduledAt);

  console.log('Banner classes after:', maintenanceBanner.className);
};
