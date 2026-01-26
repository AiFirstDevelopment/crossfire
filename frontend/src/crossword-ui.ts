import type { ClientGrid, ClientCell } from './types';

export interface CrosswordUIOptions {
  grid: ClientGrid;
  filledCells: Record<string, string>;
  cellCorrectness: Record<string, boolean>;
  onCellChange: (row: number, col: number, letter: string) => void;
  onHintRequest: (row: number, col: number) => void;
}

export class CrosswordUI {
  private container: HTMLElement;
  private options: CrosswordUIOptions;
  private cellElements: Map<string, HTMLInputElement> = new Map();

  constructor(container: HTMLElement, options: CrosswordUIOptions) {
    this.container = container;
    this.options = options;
    this.render();
  }

  private render() {
    const { grid } = this.options;
    this.container.innerHTML = '';
    this.cellElements.clear();

    const table = document.createElement('div');
    table.className = 'crossword-grid';
    table.style.display = 'grid';
    table.style.gridTemplateColumns = `repeat(${grid.width}, 44px)`;
    table.style.gridTemplateRows = `repeat(${grid.height}, 44px)`;
    table.style.gap = '2px';

    // Create word number labels map
    const wordNumbers = new Map<string, number>();
    for (const word of grid.words) {
      const key = `${word.startRow},${word.startCol}`;
      if (!wordNumbers.has(key)) {
        wordNumbers.set(key, word.index);
      }
    }

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.cells[row][col];
        const cellEl = this.createCell(row, col, cell, wordNumbers.get(`${row},${col}`));
        table.appendChild(cellEl);
      }
    }

    this.container.appendChild(table);
  }

  private createCell(row: number, col: number, cell: ClientCell | null, wordNumber?: number): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'crossword-cell-wrapper';

    if (cell === null) {
      wrapper.className += ' black';
      return wrapper;
    }

    const key = `${row},${col}`;
    const filledLetter = this.options.filledCells[key] || '';
    const isCorrect = this.options.cellCorrectness[key];

    if (wordNumber) {
      const numberEl = document.createElement('span');
      numberEl.className = 'cell-number';
      numberEl.textContent = String(wordNumber);
      wrapper.appendChild(numberEl);
    }

    const cellEl = document.createElement('div');
    cellEl.className = 'crossword-cell';
    cellEl.contentEditable = 'true';
    cellEl.textContent = filledLetter;
    cellEl.dataset.row = String(row);
    cellEl.dataset.col = String(col);
    cellEl.setAttribute('inputmode', 'text');
    cellEl.setAttribute('autocapitalize', 'characters');
    cellEl.setAttribute('autocomplete', 'off');
    cellEl.setAttribute('autocorrect', 'off');
    cellEl.setAttribute('spellcheck', 'false');

    if (isCorrect === true) {
      cellEl.classList.add('correct');
    } else if (isCorrect === false) {
      cellEl.classList.add('incorrect');
    }

    cellEl.addEventListener('input', () => {
      // Get the text and keep only the last character typed
      let text = cellEl.textContent || '';
      text = text.toUpperCase().replace(/[^A-Z]/g, '');
      const letter = text.slice(-1);
      cellEl.textContent = letter;

      // Move cursor to end
      if (letter) {
        const range = document.createRange();
        range.selectNodeContents(cellEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        this.options.onCellChange(row, col, letter);
        this.moveToNextCell(row, col);
      }
    });

    cellEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && !cellEl.textContent) {
        e.preventDefault();
        this.moveToPrevCell(row, col);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.moveToNextCell(row, col, 'across');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.moveToPrevCell(row, col, 'across');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveToNextCell(row, col, 'down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveToPrevCell(row, col, 'down');
      } else if (e.key === 'Enter') {
        e.preventDefault();
      }
    });

    cellEl.addEventListener('focus', () => {
      // Select all text on focus
      const range = document.createRange();
      range.selectNodeContents(cellEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });

    // Long press for hint (mobile)
    let longPressTimer: number | null = null;

    const startLongPress = () => {
      longPressTimer = window.setTimeout(() => {
        this.options.onHintRequest(row, col);
      }, 500);
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    cellEl.addEventListener('touchstart', () => {
      startLongPress();
    }, { passive: true });

    cellEl.addEventListener('touchend', () => {
      cancelLongPress();
    });

    cellEl.addEventListener('touchmove', () => {
      cancelLongPress();
    });

    cellEl.addEventListener('touchcancel', () => {
      cancelLongPress();
    });

    // Right-click for hint (desktop)
    cellEl.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      this.options.onHintRequest(row, col);
    });

    this.cellElements.set(key, cellEl as unknown as HTMLInputElement);
    wrapper.appendChild(cellEl);
    return wrapper;
  }

  private moveToNextCell(row: number, col: number, direction?: 'across' | 'down') {
    const { grid } = this.options;
    let nextRow = row;
    let nextCol = col;

    if (direction === 'down') {
      nextRow++;
    } else if (direction === 'across') {
      nextCol++;
    } else {
      // Auto-detect direction based on current word
      nextCol++;
      if (nextCol >= grid.width || !grid.cells[nextRow][nextCol]) {
        nextCol = col;
        nextRow++;
      }
    }

    const nextKey = `${nextRow},${nextCol}`;
    const nextInput = this.cellElements.get(nextKey);
    if (nextInput) {
      nextInput.focus();
    }
  }

  private moveToPrevCell(row: number, col: number, direction?: 'across' | 'down') {
    let prevRow = row;
    let prevCol = col;

    if (direction === 'down') {
      prevRow--;
    } else if (direction === 'across') {
      prevCol--;
    } else {
      prevCol--;
      if (prevCol < 0) {
        prevCol = col;
        prevRow--;
      }
    }

    const prevKey = `${prevRow},${prevCol}`;
    const prevInput = this.cellElements.get(prevKey);
    if (prevInput) {
      prevInput.focus();
    }
  }

  update(filledCells: Record<string, string>, cellCorrectness: Record<string, boolean>) {
    this.options.filledCells = filledCells;
    this.options.cellCorrectness = cellCorrectness;

    for (const [key, cell] of this.cellElements) {
      const letter = filledCells[key] || '';
      const isCorrect = cellCorrectness[key];

      cell.textContent = letter;
      cell.classList.remove('correct', 'incorrect');

      if (isCorrect === true) {
        cell.classList.add('correct');
      } else if (isCorrect === false) {
        cell.classList.add('incorrect');
      }
    }
  }

  focusFirstCell() {
    const firstInput = this.cellElements.get('0,0') || this.cellElements.values().next().value;
    firstInput?.focus();
  }
}
