import humanId from 'human-id';
import clg from 'crossword-layout-generator';
import type { ClientGrid, ClientCell, ClientWordPlacement, GameResult } from './types';

interface LayoutInput {
  clue: string;
  answer: string;
}

interface LayoutResult {
  clue: string;
  answer: string;
  startx: number;
  starty: number;
  position: number;
  orientation: 'across' | 'down' | 'none';
}

interface LayoutOutput {
  rows: number;
  cols: number;
  table: string[][];
  result: LayoutResult[];
}

interface GridCell {
  letter: string;
  wordIndices: number[];
  isIntersection: boolean;
}

interface FullGrid {
  width: number;
  height: number;
  cells: (GridCell | null)[][];
  words: WordPlacement[];
}

interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: 'across' | 'down';
  index: number;
}

export interface BotGameState {
  phase: 'submitting' | 'solving' | 'finished';
  botId: string;
  botName: string;
  playerId: string;
  playerName: string;
  // Player's grid (bot's words for player to solve)
  playerGrid: ClientGrid | null;
  playerGridFull: FullGrid | null;
  playerFirstLetters: Record<string, string>;
  playerFilledCells: Record<string, string>;
  playerCellCorrectness: Record<string, boolean>;
  // Bot's grid (player's words for bot to solve)
  botGrid: FullGrid | null;
  botFilledCells: Record<string, string>;
  botProgress: number;
  // Timing
  phaseStartedAt: number;
  submissionTimeoutMs: number;
  solvingTimeoutMs: number;
  // Results
  result: GameResult | null;
}

type StateChangeHandler = (state: BotGameState) => void;
type HintUsedHandler = (penaltyMs: number) => void;

// Seeded random number generator for deterministic behavior
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export class BotGame {
  private state: BotGameState;
  private stateHandlers: Set<StateChangeHandler> = new Set();
  private hintHandler: HintUsedHandler | null = null;
  private rng: SeededRandom;
  private wordList: string[];
  private botSolveInterval: number | null = null;
  private playerPenaltyMs: number = 0;
  private playerStartTime: number = 0;

  constructor(_validWords: Set<string>, wordList: string[]) {
    this.wordList = wordList;
    this.rng = new SeededRandom();
    this.state = this.createInitialState();
  }

  private createInitialState(): BotGameState {
    const botId = humanId({ separator: '-', capitalize: false, adjectiveCount: 1 });
    return {
      phase: 'submitting',
      botId,
      botName: this.formatBotName(botId),
      playerId: 'player',
      playerName: 'You',
      playerGrid: null,
      playerGridFull: null,
      playerFirstLetters: {},
      playerFilledCells: {},
      playerCellCorrectness: {},
      botGrid: null,
      botFilledCells: {},
      botProgress: 0,
      phaseStartedAt: Date.now(),
      submissionTimeoutMs: 60000,
      solvingTimeoutMs: 300000,
      result: null,
    };
  }

  private formatBotName(id: string): string {
    // Convert "blue-table-stop" to "Blue Table"
    const parts = id.split('-').slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  onHintUsed(handler: HintUsedHandler): void {
    this.hintHandler = handler;
  }

  private updateState(partial: Partial<BotGameState>) {
    this.state = { ...this.state, ...partial };
    this.stateHandlers.forEach(h => h(this.state));
  }

  getState(): BotGameState {
    return this.state;
  }

  getBotName(): string {
    return this.state.botName;
  }

  // Player submits their words
  submitWords(words: string[]): boolean {
    if (this.state.phase !== 'submitting') return false;

    // Generate bot's crossword from player's words
    const botGridResult = this.generateGrid(words);
    if (!botGridResult) {
      return false;
    }

    // Generate bot's words and create player's crossword
    const botWords = this.pickBotWords();
    const playerGridResult = this.generateGrid(botWords);
    if (!playerGridResult) {
      // Try again with different words
      const retryWords = this.pickBotWords();
      const retryResult = this.generateGrid(retryWords);
      if (!retryResult) {
        return false;
      }
      this.state.playerGridFull = retryResult.full;
      this.state.playerGrid = retryResult.client;
      this.state.playerFirstLetters = retryResult.firstLetters;
    } else {
      this.state.playerGridFull = playerGridResult.full;
      this.state.playerGrid = playerGridResult.client;
      this.state.playerFirstLetters = playerGridResult.firstLetters;
    }

    this.state.botGrid = botGridResult.full;

    // Pre-fill first letters for player
    const filledCells = { ...this.state.playerFirstLetters };
    const cellCorrectness: Record<string, boolean> = {};
    for (const key of Object.keys(filledCells)) {
      cellCorrectness[key] = true;
    }

    this.updateState({
      phase: 'solving',
      phaseStartedAt: Date.now(),
      playerFilledCells: filledCells,
      playerCellCorrectness: cellCorrectness,
    });

    this.playerStartTime = Date.now();

    // Start bot solving in background
    this.startBotSolving();

    return true;
  }

  private pickBotWords(): string[] {
    // Pick 4 words that are likely to form a valid crossword
    // Prefer words with common letters (E, A, R, S, T, N, O, I)
    const commonLetters = new Set(['E', 'A', 'R', 'S', 'T', 'N', 'O', 'I', 'L']);

    // Filter to words 4-8 letters that have at least 2 common letters
    const goodWords = this.wordList.filter(w => {
      const upper = w.toUpperCase();
      if (upper.length < 4 || upper.length > 8) return false;
      const commonCount = [...upper].filter(l => commonLetters.has(l)).length;
      return commonCount >= 2;
    });

    // Shuffle and try to find 4 words that work together
    const shuffled = this.rng.shuffle(goodWords);

    for (let attempt = 0; attempt < 50; attempt++) {
      const startIdx = attempt * 4;
      const candidates = shuffled.slice(startIdx, startIdx + 4);
      if (candidates.length < 4) break;

      // Quick check: do they share letters?
      const allLetters = new Set<string>();
      candidates.forEach(w => [...w.toUpperCase()].forEach(l => allLetters.add(l)));

      // Need at least some shared letters
      let sharedPairs = 0;
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          const letters1 = new Set([...candidates[i].toUpperCase()]);
          const letters2 = new Set([...candidates[j].toUpperCase()]);
          const shared = [...letters1].filter(l => letters2.has(l));
          if (shared.length > 0) sharedPairs++;
        }
      }

      if (sharedPairs >= 3) {
        return candidates.map(w => w.toUpperCase());
      }
    }

    // Fallback: return first 4 words (may fail grid generation)
    return shuffled.slice(0, 4).map(w => w.toUpperCase());
  }

  private generateGrid(words: string[]): { full: FullGrid; client: ClientGrid; firstLetters: Record<string, string> } | null {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const orderedWords = attempt === 0 ? words : this.rng.shuffle(words);

      const input: LayoutInput[] = orderedWords.map(word => ({
        clue: word,
        answer: word.toUpperCase().trim()
      }));

      const layout: LayoutOutput = clg.generateLayout(input);
      const placedWords = layout.result.filter(r => r.orientation !== 'none');

      if (placedWords.length === 4) {
        return this.buildGrids(layout, placedWords);
      }
    }

    return null;
  }

  private buildGrids(layout: LayoutOutput, placedWords: LayoutResult[]): { full: FullGrid; client: ClientGrid; firstLetters: Record<string, string> } {
    const cells: (GridCell | null)[][] = [];
    for (let row = 0; row < layout.rows; row++) {
      cells[row] = [];
      for (let col = 0; col < layout.cols; col++) {
        const letter = layout.table[row][col];
        if (letter && letter !== ' ' && letter !== '-') {
          cells[row][col] = {
            letter: letter.toUpperCase(),
            wordIndices: [],
            isIntersection: false
          };
        } else {
          cells[row][col] = null;
        }
      }
    }

    const placements: WordPlacement[] = placedWords.map((result, idx) => {
      const placement: WordPlacement = {
        word: result.answer,
        startRow: result.starty - 1,
        startCol: result.startx - 1,
        direction: result.orientation as 'across' | 'down',
        index: idx + 1
      };

      const rowDelta = placement.direction === 'down' ? 1 : 0;
      const colDelta = placement.direction === 'across' ? 1 : 0;

      for (let i = 0; i < result.answer.length; i++) {
        const row = placement.startRow + i * rowDelta;
        const col = placement.startCol + i * colDelta;
        const cell = cells[row]?.[col];
        if (cell) {
          if (cell.wordIndices.length > 0) {
            cell.isIntersection = true;
          }
          cell.wordIndices.push(placement.index);
        }
      }

      return placement;
    });

    const fullGrid: FullGrid = {
      width: layout.cols,
      height: layout.rows,
      cells,
      words: placements
    };

    // Create client grid (no letters)
    const clientCells: (ClientCell | null)[][] = cells.map(row =>
      row.map(cell => {
        if (cell === null) return null;
        return {
          wordIndices: cell.wordIndices,
          isIntersection: cell.isIntersection
        };
      })
    );

    const clientWords: ClientWordPlacement[] = placements.map(word => ({
      startRow: word.startRow,
      startCol: word.startCol,
      direction: word.direction,
      index: word.index,
      length: word.word.length
    }));

    const clientGrid: ClientGrid = {
      width: fullGrid.width,
      height: fullGrid.height,
      cells: clientCells,
      words: clientWords
    };

    // Get first letters
    const firstLetters: Record<string, string> = {};
    for (const word of placements) {
      const key = `${word.startRow},${word.startCol}`;
      const cell = cells[word.startRow]?.[word.startCol];
      if (cell) {
        firstLetters[key] = cell.letter;
      }
    }

    return { full: fullGrid, client: clientGrid, firstLetters };
  }

  private startBotSolving() {
    if (!this.state.botGrid) return;

    const grid = this.state.botGrid;

    // Get all cells the bot needs to fill (excluding first letters which are pre-filled)
    const cellsToFill: { row: number; col: number; letter: string }[] = [];
    const firstLetterKeys = new Set<string>();

    for (const word of grid.words) {
      firstLetterKeys.add(`${word.startRow},${word.startCol}`);
    }

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.cells[row][col];
        const key = `${row},${col}`;
        if (cell && !firstLetterKeys.has(key)) {
          cellsToFill.push({ row, col, letter: cell.letter });
        }
      }
    }

    // Shuffle the order bot fills cells
    const shuffledCells = this.rng.shuffle(cellsToFill);

    // Pre-fill first letters for bot
    const botFilled: Record<string, string> = {};
    for (const word of grid.words) {
      const key = `${word.startRow},${word.startCol}`;
      const cell = grid.cells[word.startRow]?.[word.startCol];
      if (cell) {
        botFilled[key] = cell.letter;
      }
    }
    this.state.botFilledCells = botFilled;

    let cellIndex = 0;
    const totalCells = this.countTotalCells(grid);

    // Bot solving loop - random delays between 800ms-2500ms per cell
    // This makes the bot slower than most humans, giving players a good chance to win
    const solveNextCell = () => {
      if (this.state.phase !== 'solving' || cellIndex >= shuffledCells.length) {
        if (this.botSolveInterval) {
          clearTimeout(this.botSolveInterval);
          this.botSolveInterval = null;
        }
        return;
      }

      const { row, col, letter } = shuffledCells[cellIndex];
      const key = `${row},${col}`;

      // Bot fills the cell
      this.state.botFilledCells[key] = letter;
      cellIndex++;

      // Calculate bot progress
      const filledCount = Object.keys(this.state.botFilledCells).length;
      const progress = Math.round((filledCount / totalCells) * 100);
      this.updateState({ botProgress: progress });

      // Check if bot completed
      if (filledCount >= totalCells) {
        this.endGame('bot', 'completed');
        return;
      }

      // Schedule next cell with random delay
      // Base delay 800-2500ms, occasionally longer pauses (simulating thinking)
      let delay = this.rng.nextInt(800, 2500);
      if (this.rng.next() < 0.1) {
        delay += this.rng.nextInt(1000, 3000); // Occasional longer pause
      }

      this.botSolveInterval = window.setTimeout(solveNextCell, delay);
    };

    // Start after initial delay (bot "looking at puzzle")
    this.botSolveInterval = window.setTimeout(solveNextCell, this.rng.nextInt(2000, 4000));
  }

  private countTotalCells(grid: FullGrid): number {
    let count = 0;
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell !== null) count++;
      }
    }
    return count;
  }

  // Player updates a cell
  updateCell(row: number, col: number, letter: string) {
    if (this.state.phase !== 'solving' || !this.state.playerGridFull) return;

    const key = `${row},${col}`;
    const cell = this.state.playerGridFull.cells[row]?.[col];
    if (!cell) return;

    const upperLetter = letter.toUpperCase();
    const isCorrect = cell.letter === upperLetter;

    this.updateState({
      playerFilledCells: {
        ...this.state.playerFilledCells,
        [key]: upperLetter,
      },
      playerCellCorrectness: {
        ...this.state.playerCellCorrectness,
        [key]: isCorrect,
      },
    });

    // Check if player completed
    const totalCells = this.countTotalCells(this.state.playerGridFull);
    let correctCells = 0;
    for (const [, correct] of Object.entries(this.state.playerCellCorrectness)) {
      if (correct) correctCells++;
    }

    if (correctCells >= totalCells) {
      this.endGame('player', 'completed');
    }
  }

  // Player requests a hint
  requestHint(row: number, col: number) {
    if (this.state.phase !== 'solving' || !this.state.playerGridFull) return;

    const cell = this.state.playerGridFull.cells[row]?.[col];
    if (!cell) return;

    const key = `${row},${col}`;

    // If already correct, no hint needed
    if (this.state.playerCellCorrectness[key] === true) return;

    // Reveal the letter
    this.updateState({
      playerFilledCells: {
        ...this.state.playerFilledCells,
        [key]: cell.letter,
      },
      playerCellCorrectness: {
        ...this.state.playerCellCorrectness,
        [key]: true,
      },
    });

    // Add penalty
    this.playerPenaltyMs += 15000;
    if (this.hintHandler) {
      this.hintHandler(15000);
    }

    // Check if player completed
    const totalCells = this.countTotalCells(this.state.playerGridFull);
    let correctCells = 0;
    for (const correct of Object.values(this.state.playerCellCorrectness)) {
      if (correct) correctCells++;
    }

    if (correctCells >= totalCells) {
      this.endGame('player', 'completed');
    }
  }

  private endGame(winnerId: 'player' | 'bot', winReason: 'completed' | 'timeout' | 'opponent-left' | 'tie') {
    if (this.botSolveInterval) {
      clearTimeout(this.botSolveInterval);
      this.botSolveInterval = null;
    }

    const playerTime = Date.now() - this.playerStartTime + this.playerPenaltyMs;

    // Calculate progress
    let playerProgress = 0;
    let botProgress = 0;

    if (this.state.playerGridFull) {
      const total = this.countTotalCells(this.state.playerGridFull);
      let correct = 0;
      for (const c of Object.values(this.state.playerCellCorrectness)) {
        if (c) correct++;
      }
      playerProgress = Math.round((correct / total) * 100);
    }

    if (this.state.botGrid) {
      const total = this.countTotalCells(this.state.botGrid);
      const filled = Object.keys(this.state.botFilledCells).length;
      botProgress = Math.round((filled / total) * 100);
    }

    const result: GameResult = {
      winnerId: winnerId === 'player' ? 'player' : this.state.botId,
      winReason,
      yourTime: playerTime,
      opponentTime: -1, // Bot doesn't track time
      yourProgress: playerProgress,
      opponentProgress: botProgress,
    };

    this.updateState({
      phase: 'finished',
      result,
    });
  }

  // Player wants to play again
  playAgain(): boolean {
    // Reset state for new game
    this.state = this.createInitialState();
    this.playerPenaltyMs = 0;
    this.playerStartTime = 0;
    this.stateHandlers.forEach(h => h(this.state));
    return true;
  }

  // Clean up
  destroy() {
    if (this.botSolveInterval) {
      clearTimeout(this.botSolveInterval);
      this.botSolveInterval = null;
    }
  }
}
