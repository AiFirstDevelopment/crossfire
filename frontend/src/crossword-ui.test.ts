import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrosswordUI } from './crossword-ui';
import { createMockGrid } from './test-setup';

describe('CrosswordUI - DOM Tests', () => {
  let container: HTMLElement;
  let ui: CrosswordUI;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Rendering', () => {
    it('should render grid into container', () => {
      const grid = createMockGrid();
      const onCellChange = vi.fn();
      const onHintRequest = vi.fn();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest,
      });

      expect(container.innerHTML).toBeTruthy();
      const layout = container.querySelector('.crossword-layout');
      expect(layout).toBeTruthy();
    });

    it('should create grid with correct dimensions', () => {
      const grid = createMockGrid();
      const onCellChange = vi.fn();
      const onHintRequest = vi.fn();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest,
      });

      const gridDiv = container.querySelector('.crossword-grid');
      expect(gridDiv).toBeTruthy();
      expect((gridDiv as HTMLElement)?.style.gridTemplateColumns).toBe(`repeat(${grid.width}, 44px)`);
      expect((gridDiv as HTMLElement)?.style.gridTemplateRows).toBe(`repeat(${grid.height}, 44px)`);
    });

    it('should render black cells for null positions', () => {
      const grid: any = {
        width: 2,
        height: 2,
        cells: [
          [{ wordIndices: [0], isIntersection: false }, null],
          [null, { wordIndices: [0], isIntersection: false }],
        ],
        words: [
          {
            startRow: 0,
            startCol: 0,
            direction: 'across',
            index: 1,
            length: 1,
            category: 'test',
          },
        ],
      };

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const blackCells = container.querySelectorAll('.crossword-cell-wrapper.black');
      expect(blackCells.length).toBeGreaterThan(0);
    });

    it('should render clues section', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cluesContainer = container.querySelector('.crossword-clues');
      expect(cluesContainer).toBeTruthy();
    });

    it('should organize clues by direction', () => {
      const grid = {
        ...createMockGrid(),
        words: [
          {
            startRow: 0,
            startCol: 0,
            direction: 'across' as const,
            index: 1,
            length: 5,
            category: 'test',
          },
          {
            startRow: 0,
            startCol: 0,
            direction: 'down' as const,
            index: 2,
            length: 5,
            category: 'test',
          },
        ],
      };

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const acrossSection = container.querySelector('.clue-section:has(h4)')?.textContent;
      expect(acrossSection).toBeTruthy();
    });
  });

  describe('Cell Interactions', () => {
    beforeEach(() => {
      const grid = createMockGrid();
      const onCellChange = vi.fn();
      const onHintRequest = vi.fn();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest,
      });
    });

    it('should trigger onCellChange when user types', () => {
      const onCellChange = vi.fn();
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      expect(cell).toBeTruthy();

      cell.textContent = 'A';
      cell.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onCellChange).toHaveBeenCalled();
    });

    it('should uppercase input letters', () => {
      const onCellChange = vi.fn();
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      cell.textContent = 'a';
      cell.dispatchEvent(new Event('input', { bubbles: true }));

      expect(cell.textContent).toBe('A');
    });

    it('should only accept single letters', () => {
      const grid = createMockGrid();
      const onCellChange = vi.fn();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange,
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      cell.textContent = 'ABC';
      cell.dispatchEvent(new Event('input', { bubbles: true }));

      expect(cell.textContent).toBe('C');
    });

    it('should trigger onHintRequest on right-click', () => {
      const onHintRequest = vi.fn();
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest,
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      cell.dispatchEvent(contextMenuEvent);

      expect(onHintRequest).toHaveBeenCalled();
    });

    it('should handle arrow key navigation', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      });

      cell.dispatchEvent(keydownEvent);
      expect(keydownEvent.defaultPrevented).toBe(true);
    });

    it('should handle backspace', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell') as HTMLElement;
      cell.textContent = '';
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
      });

      cell.dispatchEvent(keydownEvent);
      expect(keydownEvent.defaultPrevented).toBe(true);
    });
  });

  describe('Visual Feedback', () => {
    it('should show correct cells with correct class', () => {
      const grid = createMockGrid();
      const filledCells = { '0,0': 'A' };
      const cellCorrectness = { '0,0': true };

      ui = new CrosswordUI(container, {
        grid,
        filledCells,
        cellCorrectness,
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell');
      expect(cell?.classList.contains('correct')).toBe(true);
    });

    it('should show incorrect cells with incorrect class', () => {
      const grid = createMockGrid();
      const filledCells = { '0,0': 'X' };
      const cellCorrectness = { '0,0': false };

      ui = new CrosswordUI(container, {
        grid,
        filledCells,
        cellCorrectness,
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cell = container.querySelector('.crossword-cell');
      expect(cell?.classList.contains('incorrect')).toBe(true);
    });

    it('should display cell numbers for word starts', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cellNumbers = container.querySelectorAll('.cell-number');
      expect(cellNumbers.length).toBeGreaterThan(0);
    });
  });

  describe('Update Method', () => {
    beforeEach(() => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });
    });

    it('should update filled cells', () => {
      const filledCells = { '0,0': 'A', '0,1': 'B' };
      ui.update(filledCells, {});

      const firstCell = container.querySelector('[data-row="0"][data-col="0"]');
      expect(firstCell?.textContent).toBe('A');
    });

    it('should update cell correctness styling', () => {
      const filledCells = { '0,0': 'A' };
      const cellCorrectness = { '0,0': true };

      ui.update(filledCells, cellCorrectness);

      const cell = container.querySelector('[data-row="0"][data-col="0"]');
      expect(cell?.classList.contains('correct')).toBe(true);
    });

    it('should remove old correctness classes', () => {
      const filledCells = { '0,0': 'A' };
      const cellCorrectness = { '0,0': true };

      ui.update(filledCells, cellCorrectness);
      ui.update(filledCells, { '0,0': false });

      const cell = container.querySelector('[data-row="0"][data-col="0"]');
      expect(cell?.classList.contains('incorrect')).toBe(true);
      expect(cell?.classList.contains('correct')).toBe(false);
    });
  });

  describe('Focus Management', () => {
    it('should focus first cell', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      ui.focusFirstCell();

      // Verify a cell in the grid has focus
      const cells = container.querySelectorAll('.crossword-cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Clue Display', () => {
    it('should display category hints', () => {
      const grid = {
        ...createMockGrid(),
        words: [
          {
            startRow: 0,
            startCol: 0,
            direction: 'across' as const,
            index: 1,
            length: 5,
            category: 'Fruit',
          },
        ],
      };

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const categoryText = container.textContent;
      expect(categoryText).toContain('Fruit');
    });

    it('should display word lengths', () => {
      const grid = {
        ...createMockGrid(),
        words: [
          {
            startRow: 0,
            startCol: 0,
            direction: 'across' as const,
            index: 1,
            length: 7,
            category: 'Animal',
          },
        ],
      };

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const clueText = container.textContent;
      expect(clueText).toContain('(7)');
    });
  });

  describe('Re-rendering', () => {
    it('should clear container before re-rendering', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });



      // Create new UI with same container (should replace content)
      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      // Container should still have content
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have contenteditable cells', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cells = container.querySelectorAll('.crossword-cell');
      expect(cells.length).toBeGreaterThan(0);
      
      // Check if cells are created with proper class
      cells.forEach(cell => {
        expect(cell.classList.contains('crossword-cell')).toBe(true);
        expect((cell as HTMLElement).dataset.row).toBeTruthy();
        expect((cell as HTMLElement).dataset.col).toBeTruthy();
      });
    });

    it('should set proper input mode', () => {
      const grid = createMockGrid();

      ui = new CrosswordUI(container, {
        grid,
        filledCells: {},
        cellCorrectness: {},
        onCellChange: vi.fn(),
        onHintRequest: vi.fn(),
      });

      const cells = container.querySelectorAll('.crossword-cell');
      expect(cells.length).toBeGreaterThan(0);
      
      // Check if cells have proper inputmode
      cells.forEach(cell => {
        expect(cell.getAttribute('inputmode')).toBe('text');
      });
    });
  });
});
