import humanId from 'human-id';
import clg from 'crossword-layout-generator';
import type { ClientGrid, ClientCell, ClientWordPlacement, GameResult } from './types';
import { getWordCategory, hasCategory } from '../../shared/categories';

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
  // Hints
  hintsUsed: number;
  maxHints: number;
  // Results
  result: GameResult | null;
}

type StateChangeHandler = (state: BotGameState) => void;
type HintUsedHandler = (hintsRemaining: number) => void;

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
      playerFilledCells: {},
      playerCellCorrectness: {},
      botGrid: null,
      botFilledCells: {},
      botProgress: 0,
      phaseStartedAt: Date.now(),
      submissionTimeoutMs: 60000,
      solvingTimeoutMs: 300000,
      hintsUsed: 0,
      maxHints: 4,
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
  submitWords(words: string[]): { success: boolean; error?: string; suggestions?: { wordIndex: number; replacements: string[] }[] } {
    if (this.state.phase !== 'submitting') return { success: false, error: 'Not in submission phase' };

    // Generate bot's crossword from player's words
    const botGridResult = this.generateGrid(words);
    if (!botGridResult.success) {
      return { success: false, error: botGridResult.error, suggestions: botGridResult.suggestions };
    }

    // Generate bot's words and create player's crossword
    const botWords = this.pickBotWords();
    const playerGridResult = this.generateGrid(botWords);
    if (!playerGridResult.success) {
      // Try again with different words
      const retryWords = this.pickBotWords();
      const retryResult = this.generateGrid(retryWords);
      if (!retryResult.success) {
        return { success: false, error: 'Bot could not generate a puzzle' };
      }
      this.state.playerGridFull = retryResult.grid!.full;
      this.state.playerGrid = retryResult.grid!.client;
    } else {
      this.state.playerGridFull = playerGridResult.grid!.full;
      this.state.playerGrid = playerGridResult.grid!.client;
    }

    this.state.botGrid = botGridResult.grid!.full;

    // Pre-fill first letter and every 4th letter (positions 0, 4, 8, etc.) of each word
    const preFilled: Record<string, string> = {};
    const preFilledCorrectness: Record<string, boolean> = {};

    if (this.state.playerGridFull) {
      for (const wordPlacement of this.state.playerGridFull.words) {
        const rowDelta = wordPlacement.direction === 'down' ? 1 : 0;
        const colDelta = wordPlacement.direction === 'across' ? 1 : 0;

        for (let i = 0; i < wordPlacement.word.length; i++) {
          // Pre-fill positions 0, 4, 8, 12... (first and every 4th letter)
          if (i % 4 === 0) {
            const row = wordPlacement.startRow + i * rowDelta;
            const col = wordPlacement.startCol + i * colDelta;
            const key = `${row},${col}`;
            const letter = wordPlacement.word[i];
            preFilled[key] = letter;
            preFilledCorrectness[key] = true;
          }
        }
      }
    }

    this.updateState({
      phase: 'solving',
      phaseStartedAt: Date.now(),
      playerFilledCells: preFilled,
      playerCellCorrectness: preFilledCorrectness,
    });

    this.playerStartTime = Date.now();

    // Start bot solving in background
    this.startBotSolving();

    return { success: true };
  }

  private pickBotWords(): string[] {
    // Pick 4 words that are likely to form a valid crossword
    // Prefer words with common letters (E, A, R, S, T, N, O, I)
    const commonLetters = new Set(['E', 'A', 'R', 'S', 'T', 'N', 'O', 'I', 'L']);

    // Filter to words 4-8 letters that have at least 2 common letters AND have a known category
    const goodWords = this.wordList.filter(w => {
      const upper = w.toUpperCase();
      if (upper.length < 4 || upper.length > 8) return false;
      // Only pick words that have categories so hints are useful
      if (!hasCategory(w)) return false;
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

  private generateGrid(words: string[]): { success: true; grid: { full: FullGrid; client: ClientGrid } } | { success: false; error: string; suggestions?: { wordIndex: number; replacements: string[] }[] } {
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
        return { success: true, grid: this.buildGrids(layout, placedWords) };
      }
    }

    // Analyze why and provide specific feedback with suggestions
    const analysis = this.analyzeWordConnectivity(words);
    return { success: false, error: analysis.message, suggestions: analysis.suggestions };
  }

  // Analyze why words can't form a crossword and give specific feedback with suggestions
  private analyzeWordConnectivity(words: string[]): { message: string; suggestions: { wordIndex: number; replacements: string[] }[] } {
    const normalized = words.map(w => w.toUpperCase());

    // Get letters in a word as a Set
    const getLetters = (word: string): Set<string> => new Set(word.split(''));

    // Find shared letters between two words
    const sharedLetters = (word1: string, word2: string): string[] => {
      const letters1 = getLetters(word1);
      const letters2 = getLetters(word2);
      return [...letters1].filter(l => letters2.has(l));
    };

    // Build connectivity map
    const connections: Record<number, number[]> = {};
    const sharedWith: Record<string, string[]> = {};

    for (let i = 0; i < normalized.length; i++) {
      connections[i] = [];
      for (let j = 0; j < normalized.length; j++) {
        if (i !== j) {
          const shared = sharedLetters(normalized[i], normalized[j]);
          if (shared.length > 0) {
            connections[i].push(j);
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            sharedWith[key] = shared;
          }
        }
      }
    }

    // Find replacement suggestions for a word index
    const findReplacements = (wordIndex: number): string[] => {
      const otherWords = normalized.filter((_, i) => i !== wordIndex);
      const otherLetters = new Set<string>();
      otherWords.forEach(w => getLetters(w).forEach(l => otherLetters.add(l)));

      // Find words that share at least 2 letters with the other words
      const candidates = this.wordList
        .filter(w => {
          const upper = w.toUpperCase();
          if (upper === normalized[wordIndex]) return false;
          if (normalized.includes(upper)) return false;
          const letters = getLetters(upper);
          const shared = [...letters].filter(l => otherLetters.has(l));
          return shared.length >= 2 && w.length >= 3 && w.length <= 8;
        })
        .slice(0, 100); // Limit candidates for performance

      // Shuffle and take top 5
      return this.rng.shuffle(candidates).slice(0, 5).map(w => w.toUpperCase());
    };

    // Find isolated words (no shared letters with any other word)
    const isolatedIndices = normalized.map((_, i) => i).filter(i => connections[i].length === 0);

    if (isolatedIndices.length > 0) {
      const isolatedWords = isolatedIndices.map(i => normalized[i]);
      const isolatedList = isolatedWords.map(w => `"${w}"`).join(' and ');

      // Generate suggestions for isolated words
      const suggestions = isolatedIndices.map(idx => ({
        wordIndex: idx,
        replacements: findReplacements(idx)
      }));

      return {
        message: `${isolatedList} ${isolatedIndices.length === 1 ? "doesn't share any letters" : "don't share any letters"} with your other words.`,
        suggestions
      };
    }

    // Words share letters but still can't connect - find weakest connections
    const connectionScores = normalized.map((_, i) => {
      let score = 0;
      for (let j = 0; j < normalized.length; j++) {
        if (i !== j) {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          score += (sharedWith[key]?.length || 0);
        }
      }
      return { index: i, score };
    });

    connectionScores.sort((a, b) => a.score - b.score);
    const weakestIndex = connectionScores[0].index;

    const suggestions = [{
      wordIndex: weakestIndex,
      replacements: findReplacements(weakestIndex)
    }];

    return {
      message: `"${normalized[weakestIndex]}" has weak connections with your other words.`,
      suggestions
    };
  }

  private buildGrids(layout: LayoutOutput, placedWords: LayoutResult[]): { full: FullGrid; client: ClientGrid } {
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

    // Create client grid (no letters, but with category hints)
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
      length: word.word.length,
      category: getWordCategory(word.word) || 'unknown'
    }));

    const clientGrid: ClientGrid = {
      width: fullGrid.width,
      height: fullGrid.height,
      cells: clientCells,
      words: clientWords
    };

    return { full: fullGrid, client: clientGrid };
  }

  private startBotSolving() {
    if (!this.state.botGrid) return;

    const grid = this.state.botGrid;

    // Get all cells the bot needs to fill
    const cellsToFill: { row: number; col: number; letter: string }[] = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.cells[row][col];
        if (cell) {
          cellsToFill.push({ row, col, letter: cell.letter });
        }
      }
    }

    // Shuffle the order bot fills cells
    const shuffledCells = this.rng.shuffle(cellsToFill);

    // Bot starts with empty grid
    this.state.botFilledCells = {};

    let cellIndex = 0;
    const totalCells = this.countTotalCells(grid);

    // Bot solving loop - 3x slower than before with more random progress
    const solveNextBatch = () => {
      if (this.state.phase !== 'solving' || cellIndex >= shuffledCells.length) {
        if (this.botSolveInterval) {
          clearTimeout(this.botSolveInterval);
          this.botSolveInterval = null;
        }
        return;
      }

      // Random chance to just "think" without making progress (30% chance)
      if (this.rng.next() < 0.3) {
        const thinkDelay = this.rng.nextInt(6000, 16000);
        this.botSolveInterval = window.setTimeout(solveNextBatch, thinkDelay);
        return;
      }

      // Fill 1-3 cells at once (weighted toward 1) for less uniform progress
      const cellsThisBatch = this.rng.next() < 0.6 ? 1 : (this.rng.next() < 0.7 ? 2 : 3);

      for (let i = 0; i < cellsThisBatch && cellIndex < shuffledCells.length; i++) {
        const { row, col, letter } = shuffledCells[cellIndex];
        const key = `${row},${col}`;
        this.state.botFilledCells[key] = letter;
        cellIndex++;
      }

      // Calculate bot progress
      const filledCount = Object.keys(this.state.botFilledCells).length;
      const progress = Math.round((filledCount / totalCells) * 100);
      this.updateState({ botProgress: progress });

      // Check if bot completed
      if (filledCount >= totalCells) {
        this.endGame('bot', 'completed');
        return;
      }

      // Schedule next batch with random delay (doubled: 4800-15000ms base)
      let delay = this.rng.nextInt(4800, 15000);
      // 20% chance of extra long pause (simulating getting stuck)
      if (this.rng.next() < 0.2) {
        delay += this.rng.nextInt(8000, 20000);
      }

      this.botSolveInterval = window.setTimeout(solveNextBatch, delay);
    };

    // Start after longer initial delay (bot "studying puzzle")
    this.botSolveInterval = window.setTimeout(solveNextBatch, this.rng.nextInt(10000, 20000));
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

    // Check if hints are available
    if (this.state.hintsUsed >= this.state.maxHints) return;

    const cell = this.state.playerGridFull.cells[row]?.[col];
    if (!cell) return;

    const key = `${row},${col}`;

    // If already correct, no hint needed
    if (this.state.playerCellCorrectness[key] === true) return;

    // Reveal the letter and increment hints used
    const newHintsUsed = this.state.hintsUsed + 1;
    this.updateState({
      playerFilledCells: {
        ...this.state.playerFilledCells,
        [key]: cell.letter,
      },
      playerCellCorrectness: {
        ...this.state.playerCellCorrectness,
        [key]: true,
      },
      hintsUsed: newHintsUsed,
    });

    // Notify handler of remaining hints
    if (this.hintHandler) {
      this.hintHandler(this.state.maxHints - newHintsUsed);
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

    // Notify server that a bot game ended (for total games counter)
    const isProduction = window.location.hostname !== 'localhost';
    const apiUrl = isProduction
      ? 'https://crossfire-worker.joelstevick.workers.dev'
      : 'http://localhost:8787';
    fetch(`${apiUrl}/api/bot-game-ended`, { method: 'POST' }).catch(() => {
      // Ignore errors - this is just for stats
    });

    const playerTime = Date.now() - this.playerStartTime;

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

    // Extract solution from the grid the player was solving
    const solution: Record<string, string> = {};
    if (this.state.playerGridFull) {
      for (let row = 0; row < this.state.playerGridFull.height; row++) {
        for (let col = 0; col < this.state.playerGridFull.width; col++) {
          const cell = this.state.playerGridFull.cells[row][col];
          if (cell) {
            solution[`${row},${col}`] = cell.letter;
          }
        }
      }
    }

    const result: GameResult = {
      winnerId: winnerId === 'player' ? 'player' : this.state.botId,
      winReason,
      yourTime: playerTime,
      opponentTime: -1, // Bot doesn't track time
      yourProgress: playerProgress,
      opponentProgress: botProgress,
      solution,
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
