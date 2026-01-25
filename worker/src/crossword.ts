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

export function generateCrosswordGrid(words: string[]): GenerateResult {
  // Validate input
  if (words.length !== 4) {
    return { success: false, error: 'Exactly 4 words required' };
  }

  // Prepare input for the library
  const input: LayoutInput[] = words.map(word => ({
    clue: word, // We use the word itself as the clue (opponent sees blank)
    answer: word.toUpperCase().trim()
  }));

  // Generate layout
  const layout: LayoutOutput = clg.generateLayout(input);

  // Check if all words were placed
  const placedWords = layout.result.filter(r => r.orientation !== 'none');
  if (placedWords.length !== 4) {
    const unplacedCount = 4 - placedWords.length;
    return {
      success: false,
      error: `Could not place ${unplacedCount} word(s). Try words with more common letters.`
    };
  }

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
