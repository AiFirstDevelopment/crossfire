import clg from 'crossword-layout-generator';
import type { CrosswordGrid, GridCell, ClientGrid, ClientCell, ClientWordPlacement, WordPlacement } from './types';

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

export type GenerateResult = {
  success: true;
  grid: CrosswordGrid;
} | {
  success: false;
  error: string;
};

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get letters in a word as a Set
function getLetters(word: string): Set<string> {
  return new Set(word.toUpperCase().split(''));
}

// Find shared letters between two words
function sharedLetters(word1: string, word2: string): string[] {
  const letters1 = getLetters(word1);
  const letters2 = getLetters(word2);
  return [...letters1].filter(l => letters2.has(l));
}

// Analyze why words can't form a crossword and give specific feedback
function analyzeWordConnectivity(words: string[]): string {
  const normalized = words.map(w => w.toUpperCase());

  // Build connectivity map: which words share letters with which
  const connections: Record<number, number[]> = {};
  const sharedWith: Record<string, string[]> = {}; // "0-1" -> ['A', 'E']

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

  // Find isolated words (no shared letters with any other word)
  const isolated = normalized.filter((_, i) => connections[i].length === 0);

  if (isolated.length > 0) {
    const isolatedList = isolated.map(w => `"${w}"`).join(' and ');
    const otherWords = normalized.filter(w => !isolated.includes(w));

    if (otherWords.length > 0) {
      // Find common letters in the other words that the isolated word could use
      const otherLetters = new Set<string>();
      otherWords.forEach(w => getLetters(w).forEach(l => otherLetters.add(l)));
      const commonLetters = [...otherLetters].slice(0, 5).join(', ');

      return `We can't make a crossword puzzle from these words.\n\n` +
        `Problem: ${isolatedList} ${isolated.length === 1 ? "doesn't share any letters" : "don't share any letters"} with your other words.\n\n` +
        `Try replacing ${isolated.length === 1 ? 'it' : 'them'} with words containing: ${commonLetters}`;
    }

    return `We can't make a crossword puzzle from these words.\n\n` +
      `Problem: Your words don't share enough letters with each other.\n\n` +
      `Tip: Choose words that have common letters like E, A, R, S, T, or N.`;
  }

  // Words share letters but still can't connect (rare geometric issue)
  // Show which pairs share the fewest letters
  const pairInfo: { pair: string; shared: string[] }[] = [];
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const key = `${i}-${j}`;
      const shared = sharedWith[key] || [];
      pairInfo.push({
        pair: `"${normalized[i]}" & "${normalized[j]}"`,
        shared
      });
    }
  }

  // Find pairs with fewest shared letters
  pairInfo.sort((a, b) => a.shared.length - b.shared.length);
  const weakestPairs = pairInfo.filter(p => p.shared.length <= 1).slice(0, 2);

  if (weakestPairs.length > 0) {
    const weakInfo = weakestPairs.map(p =>
      p.shared.length === 0
        ? `${p.pair} share no letters`
        : `${p.pair} only share "${p.shared.join(', ')}"`
    ).join('\n• ');

    return `We can't make a crossword puzzle from these words.\n\n` +
      `Problem:\n• ${weakInfo}\n\n` +
      `Tip: Replace one word with something that shares more letters with the others.`;
  }

  // Fallback - words share letters but layout still failed
  return `We can't make a crossword puzzle from these words.\n\n` +
    `Your words share letters, but they can't be arranged into a valid crossword grid.\n\n` +
    `Tip: Try replacing one word with a longer word that has more common letters.`;
}

export function generateCrosswordGrid(words: string[]): GenerateResult {
  // Validate input
  if (words.length !== 4) {
    return { success: false, error: 'Exactly 4 words required' };
  }

  // Try multiple times with different word orders
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle word order for different layouts
    const orderedWords = attempt === 0 ? words : shuffleArray(words);

    // Prepare input for the library
    const input: LayoutInput[] = orderedWords.map(word => ({
      clue: word,
      answer: word.toUpperCase().trim()
    }));

    // Generate layout
    const layout: LayoutOutput = clg.generateLayout(input);

    // Check if all words were placed
    const placedWords = layout.result.filter(r => r.orientation !== 'none');
    if (placedWords.length === 4) {
      // Success! Build the grid
      return buildGrid(layout, placedWords);
    }

  }

  // All attempts failed - analyze why and give specific feedback
  const analysis = analyzeWordConnectivity(words);

  return {
    success: false,
    error: analysis
  };
}

function buildGrid(layout: LayoutOutput, placedWords: LayoutResult[]): GenerateResult {
  // Build our grid structure
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

  // Build word placements and mark cell word indices
  const placements: WordPlacement[] = placedWords.map((result, idx) => {
    const placement: WordPlacement = {
      word: result.answer,
      startRow: result.starty - 1, // Library uses 1-based indexing
      startCol: result.startx - 1,
      direction: result.orientation as 'across' | 'down',
      index: idx + 1
    };

    // Mark cells with word index
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

  return {
    success: true,
    grid: {
      width: layout.cols,
      height: layout.rows,
      cells,
      words: placements
    }
  };
}

// Convert full grid to client grid (letters blanked out)
export function gridToClientGrid(grid: CrosswordGrid): ClientGrid {
  const cells: (ClientCell | null)[][] = grid.cells.map(row =>
    row.map(cell => {
      if (cell === null) return null;
      return {
        wordIndices: cell.wordIndices,
        isIntersection: cell.isIntersection
      };
    })
  );

  const words: ClientWordPlacement[] = grid.words.map(word => ({
    startRow: word.startRow,
    startCol: word.startCol,
    direction: word.direction,
    index: word.index,
    length: word.word.length
  }));

  return {
    width: grid.width,
    height: grid.height,
    cells,
    words
  };
}

// Count total fillable cells in a grid
export function countTotalCells(grid: CrosswordGrid): number {
  let count = 0;
  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell !== null) {
        count++;
      }
    }
  }
  return count;
}

// Check if a player's filled cells are all correct
export function checkProgress(
  grid: CrosswordGrid,
  filledCells: Record<string, string>
): { correct: number; total: number; complete: boolean } {
  const total = countTotalCells(grid);
  let correct = 0;

  for (const [key, letter] of Object.entries(filledCells)) {
    const [rowStr, colStr] = key.split(',');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);
    const cell = grid.cells[row]?.[col];
    if (cell && cell.letter === letter.toUpperCase()) {
      correct++;
    }
  }

  return {
    correct,
    total,
    complete: correct === total
  };
}
