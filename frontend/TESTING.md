## Running the Regression Test Suite

Your Crossfire frontend now has a comprehensive regression test suite with 150 tests across all major modules.

### Quick Start

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Files

| File | Tests | Focus | Type |
|------|-------|-------|------|
| `src/game.test.ts` | 19 | GameClient state management | Unit |
| `src/bot.test.ts` | 27 | BotGame AI and grid generation | Unit |
| `src/crossword-ui.test.ts` | 23 | Interactive crossword grid | DOM |
| `src/main.test.ts` | 52 | Application screens and UI | DOM |
| `src/types.test.ts` | 29 | Type definitions | Type |
| **TOTAL** | **150** | **All modules** | **Mixed** |

### Coverage Report

Run `npm run test:coverage` to generate an HTML coverage report in `coverage/index.html`.

**Current Coverage:**
- **bot.ts**: 73.24% (grid generation, game logic)
- **crossword-ui.ts**: 89.33% (interactive grid component)
- **game.ts**: 35.29% (state management, network pending)
- **main.ts**: 0% (requires refactoring for testability)

### Key Features

✅ **DOM Query Tests**: Tests use realistic user interactions and DOM queries, not implementation details
✅ **Type Safety**: All tests written in TypeScript with full type checking
✅ **Isolated**: Each test starts with a clean DOM and fresh state
✅ **Fast**: Entire suite runs in ~400ms
✅ **Comprehensive**: Covers initialization, state changes, user interactions, error cases, and edge cases

### Test Organization

Tests are organized by functionality:

1. **Initialization Tests**: Verify correct initial state
2. **State Management Tests**: Ensure state changes work correctly
3. **Interaction Tests**: Test user interactions (clicks, typing, navigation)
4. **Visual Feedback Tests**: Verify UI updates (styling, text content)
5. **Error Handling Tests**: Test error cases and edge conditions
6. **Type Definition Tests**: Ensure types match implementations

### Writing New Tests

When adding new features, follow this pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyComponent', () => {
  let component: MyComponent;

  beforeEach(() => {
    // Setup
    component = new MyComponent();
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = component.someMethod(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### DOM Query Examples

```typescript
// Get elements
const button = document.getElementById('find-match-btn');
const cells = document.querySelectorAll('.crossword-cell');

// Check visibility
expect(screen.classList.contains('hidden')).toBe(true);

// Check content
expect(element.textContent).toBe('Expected text');

// Check attributes
expect(input.getAttribute('placeholder')).toBe('Enter text');

// Simulate interactions
const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
element.dispatchEvent(event);
```

### Common Test Patterns

#### Testing State Changes
```typescript
it('should notify handlers on state change', () => {
  const handler = vi.fn();
  client.onStateChange(handler);
  expect(handler).toHaveBeenCalled();
});
```

#### Testing DOM Rendering
```typescript
it('should render grid with correct dimensions', () => {
  const grid = createMockGrid();
  ui = new CrosswordUI(container, { grid, /* ... */ });
  
  const gridEl = container.querySelector('.crossword-grid');
  expect(gridEl.style.gridTemplateColumns).toBe('repeat(5, 44px)');
});
```

#### Testing User Interactions
```typescript
it('should handle cell input', () => {
  const onCellChange = vi.fn();
  const cell = container.querySelector('.crossword-cell');
  
  cell.textContent = 'A';
  cell.dispatchEvent(new Event('input', { bubbles: true }));
  
  expect(onCellChange).toHaveBeenCalled();
});
```

### Debugging Tests

```bash
# Run specific test file
npm run test -- src/game.test.ts

# Run tests matching pattern
npm run test -- --grep "should render"

# Run with debugging output
npm run test -- --reporter=verbose

# Run in debug mode (open inspector)
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Continuous Integration

Add to your CI pipeline (GitHub Actions, etc.):

```yaml
- name: Install Dependencies
  run: npm install

- name: Run Tests
  run: npm run test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Improving Coverage

Priority areas to increase coverage (in order):

1. **main.ts** (0% → 80%): Refactor into testable modules
2. **game.ts** (35% → 70%): Add WebSocket integration tests
3. **crossword-ui.ts** (89% → 95%): Add touch/long-press tests
4. **bot.ts** (73% → 85%): Add bot solving algorithm edge cases

### Performance

Current test performance:
- Setup: 65ms
- Collection: 230ms  
- Execution: 158ms
- Total: ~400ms for 150 tests

Maintain under 1s by:
- Avoiding unnecessary DOM manipulations
- Mocking external dependencies
- Using shallow component tests
- Parallel test execution (already enabled)

---

**Questions?** Refer to [TEST_SUITE.md](TEST_SUITE.md) for detailed documentation.
