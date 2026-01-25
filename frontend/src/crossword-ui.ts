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
    table.style.gridTemplateColumns = `repeat(${grid.width}, 40px)`;
    table.style.gridTemplateRows = `repeat(${grid.height}, 40px)`;
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

    // Add word list
    const wordList = this.createWordList();
    this.container.appendChild(wordList);
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

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.className = 'crossword-cell';
    input.value = filledLetter;
    input.dataset.row = String(row);
    input.dataset.col = String(col);

    if (isCorrect === true) {
      input.classList.add('correct');
    } else if (isCorrect === false) {
      input.classList.add('incorrect');
    }

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const letter = target.value.toUpperCase();
      target.value = letter;

      if (letter) {
        this.options.onCellChange(row, col, letter);
        this.moveToNextCell(row, col);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value) {
        this.moveToPrevCell(row, col);
      } else if (e.key === 'ArrowRight') {
        this.moveToNextCell(row, col, 'across');
      } else if (e.key === 'ArrowLeft') {
        this.moveToPrevCell(row, col, 'across');
      } else if (e.key === 'ArrowDown') {
        this.moveToNextCell(row, col, 'down');
      } else if (e.key === 'ArrowUp') {
        this.moveToPrevCell(row, col, 'down');
      }
    });

    input.addEventListener('focus', () => {
      input.select();
    });

    input.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.options.onHintRequest(row, col);
    });

    this.cellElements.set(key, input);
    wrapper.appendChild(input);
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

  private createWordList(): HTMLElement {
    const { grid } = this.options;
    const container = document.createElement('div');
    container.className = 'word-list';

    const acrossWords = grid.words.filter(w => w.direction === 'across');
    const downWords = grid.words.filter(w => w.direction === 'down');

    if (acrossWords.length > 0) {
      const acrossSection = document.createElement('div');
      acrossSection.innerHTML = `<h4>Across</h4>`;
      const list = document.createElement('ul');
      for (const word of acrossWords) {
        const li = document.createElement('li');
        li.textContent = `${word.index}. (${word.length} letters)`;
        li.addEventListener('click', () => {
          const input = this.cellElements.get(`${word.startRow},${word.startCol}`);
          input?.focus();
        });
        list.appendChild(li);
      }
      acrossSection.appendChild(list);
      container.appendChild(acrossSection);
    }

    if (downWords.length > 0) {
      const downSection = document.createElement('div');
      downSection.innerHTML = `<h4>Down</h4>`;
      const list = document.createElement('ul');
      for (const word of downWords) {
        const li = document.createElement('li');
        li.textContent = `${word.index}. (${word.length} letters)`;
        li.addEventListener('click', () => {
          const input = this.cellElements.get(`${word.startRow},${word.startCol}`);
          input?.focus();
        });
        list.appendChild(li);
      }
      downSection.appendChild(list);
      container.appendChild(downSection);
    }

    return container;
  }

  update(filledCells: Record<string, string>, cellCorrectness: Record<string, boolean>) {
    this.options.filledCells = filledCells;
    this.options.cellCorrectness = cellCorrectness;

    for (const [key, input] of this.cellElements) {
      const letter = filledCells[key] || '';
      const isCorrect = cellCorrectness[key];

      input.value = letter;
      input.classList.remove('correct', 'incorrect');

      if (isCorrect === true) {
        input.classList.add('correct');
      } else if (isCorrect === false) {
        input.classList.add('incorrect');
      }
    }
  }

  focusFirstCell() {
    const firstInput = this.cellElements.get('0,0') || this.cellElements.values().next().value;
    firstInput?.focus();
  }
}
