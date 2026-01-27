import { beforeEach, afterEach, vi } from 'vitest';

// Setup testing environment
beforeEach(() => {
  // Clear DOM before each test
  document.body.innerHTML = '';
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

// Mock WebSocket
(globalThis as any).WebSocket = vi.fn() as any;

// Mock localStorage if not available
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => {
        delete store[key];
      });
    },
    length: 0,
    key: () => null,
  } as any;
}

// Test utilities
export function createMockGrid() {
  return {
    width: 5,
    height: 5,
    cells: Array(5)
      .fill(null)
      .map(() =>
        Array(5)
          .fill(null)
          .map(() => ({
            wordIndices: [0],
            isIntersection: false,
          }))
      ),
    words: [
      {
        startRow: 0,
        startCol: 0,
        direction: 'across' as const,
        index: 1,
        length: 5,
        category: 'test',
      },
    ],
  };
}

export function createMockElement(id: string, tag = 'div') {
  const el = document.createElement(tag);
  el.id = id;
  document.body.appendChild(el);
  return el;
}

export function getElementText(id: string) {
  return document.getElementById(id)?.textContent || '';
}

export function getElementHTML(id: string) {
  return document.getElementById(id)?.innerHTML || '';
}
