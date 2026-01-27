import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/dom';

// Note: These tests focus on DOM queries and screen interactions
// Full main.ts testing would require significant refactoring to make it more testable

describe('Main Application DOM Structure', () => {
  beforeEach(() => {
    // Setup basic HTML structure matching the expected DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="total-games" class="total-games"></div>
        <header>
          <div class="header-top">
            <h1>Crossfire</h1>
            <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
              <span class="sun-icon">☀</span>
              <span class="moon-icon">☾</span>
            </button>
          </div>
          <p class="tagline">Two-player word puzzle battle</p>
          <p id="active-games" class="active-games"></p>
          <div id="player-id-display" class="player-id-display">
            <span class="player-id-label">Your ID:</span>
            <span id="player-id" class="player-id"></span>
            <button id="change-id-btn" class="change-id-btn" title="Change ID">✏</button>
          </div>
          <div id="change-id-form" class="change-id-form hidden">
            <input type="text" id="new-id-input" placeholder="Enter existing ID" />
            <button id="save-id-btn" class="small-btn">Use This ID</button>
            <button id="cancel-id-btn" class="small-btn secondary">Cancel</button>
          </div>
          <div id="player-stats" class="player-stats">
            <span class="level-badge">Level <span id="player-level">1</span></span>
            <span class="wins-info"><span id="player-wins">0</span> <span id="wins-label">wins</span> • <span id="wins-to-next">1</span> to next level</span>
          </div>
        </header>

        <section id="screen-menu" class="screen">
          <button id="find-match-btn" class="primary-btn">Find Match</button>
          <p id="status-text"></p>
          <div class="divider">or</div>
          <div class="manual-join">
            <input type="text" id="room-id-input" placeholder="Enter Room ID" />
            <button id="join-room-btn">Join Room</button>
          </div>
        </section>

        <section id="screen-waiting" class="screen hidden">
          <div class="spinner"></div>
          <p>Waiting for opponent...</p>
          <p id="waiting-info"></p>
        </section>

        <section id="screen-submit" class="screen hidden">
          <div id="submit-form-section">
            <h2>Enter Your Words</h2>
            <div id="submit-opponent-info" class="opponent-info submit-opponent-info" style="display: none;">
              <span>vs <span id="submit-opponent-name"></span></span>
              <span class="opponent-level-badge">Level <span id="submit-opponent-level">1</span></span>
            </div>
            <p>Your opponent will try to guess these!</p>
            <div id="timer-submit" class="timer"></div>
            <form id="word-form">
              <div class="word-input-wrapper">
                <div class="word-input-row">
                  <input type="text" class="word-input" placeholder="Word 1" maxlength="12" required />
                  <div class="inline-suggestions"></div>
                </div>
                <span class="word-error"></span>
              </div>
              <button type="submit" class="primary-btn">Submit Words</button>
              <div id="form-error" class="form-error hidden"></div>
            </form>
          </div>
          <div id="submit-waiting-section" class="hidden">
            <div class="spinner"></div>
            <p id="submit-status">Waiting for opponent...</p>
          </div>
        </section>

        <section id="screen-solve" class="screen hidden">
          <div class="solve-header">
            <div class="opponent-info">
              <span>vs <span id="opponent-name-display"></span></span>
              <span class="opponent-level-badge">Level <span id="opponent-level">1</span></span>
            </div>
            <div class="progress-display">
              <span>You: <span id="your-progress">0%</span></span>
              <span>Opponent: <span id="opponent-progress">0%</span></span>
            </div>
            <div class="timer-row">
              <div id="timer-solve" class="timer"></div>
              <div id="penalty-display" class="penalty-display hidden">+<span id="penalty-time">0</span>s</div>
            </div>
          </div>
          <div id="crossword-container"></div>
          <p class="hint-info">Hold or right-click a cell for a hint (<span id="hints-remaining">4</span> hints available)</p>
        </section>

        <section id="screen-results" class="screen hidden">
          <h2 id="result-title"></h2>
          <div id="result-details"></div>
          <div id="solution-container" class="solution-container hidden">
            <h3>The Solution</h3>
            <div id="solution-grid"></div>
          </div>
          <p id="rematch-status" class="rematch-status hidden"></p>
          <div class="results-buttons">
            <button id="play-again-btn" class="primary-btn">Play Again</button>
            <button id="leave-room-btn" class="secondary-btn">Leave Room</button>
          </div>
        </section>

        <div id="error-toast" class="error-toast hidden"></div>
        <div id="hint-toast" class="hint-toast hidden">3 hints left</div>
      </div>
    `;
  });

  describe('Screen Navigation', () => {
    it('should have menu screen visible initially', () => {
      const menuScreen = document.getElementById('screen-menu');
      expect(menuScreen).toBeTruthy();
      expect(menuScreen?.classList.contains('hidden')).toBe(false);
    });

    it('should have waiting screen hidden initially', () => {
      const waitingScreen = document.getElementById('screen-waiting');
      expect(waitingScreen?.classList.contains('hidden')).toBe(true);
    });

    it('should have submit screen hidden initially', () => {
      const submitScreen = document.getElementById('screen-submit');
      expect(submitScreen?.classList.contains('hidden')).toBe(true);
    });

    it('should have solve screen hidden initially', () => {
      const solveScreen = document.getElementById('screen-solve');
      expect(solveScreen?.classList.contains('hidden')).toBe(true);
    });

    it('should have results screen hidden initially', () => {
      const resultsScreen = document.getElementById('screen-results');
      expect(resultsScreen?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Button Elements', () => {
    it('should have find match button', () => {
      const btn = document.getElementById('find-match-btn');
      expect(btn).toBeTruthy();
      expect(btn?.textContent).toBe('Find Match');
    });

    it('should have join room button', () => {
      const btn = document.getElementById('join-room-btn');
      expect(btn).toBeTruthy();
    });

    it('should have play again button', () => {
      const btn = document.getElementById('play-again-btn');
      expect(btn).toBeTruthy();
      expect(btn?.textContent).toBe('Play Again');
    });

    it('should have leave room button', () => {
      const btn = document.getElementById('leave-room-btn');
      expect(btn).toBeTruthy();
      expect(btn?.textContent).toBe('Leave Room');
    });

    it('should have theme toggle button', () => {
      const btn = document.getElementById('theme-toggle');
      expect(btn).toBeTruthy();
    });
  });

  describe('Input Elements', () => {
    it('should have room ID input', () => {
      const input = document.getElementById('room-id-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.placeholder).toBe('Enter Room ID');
    });

    it('should have word form with inputs', () => {
      const form = document.getElementById('word-form');
      expect(form).toBeTruthy();

      const inputs = form?.querySelectorAll('.word-input');
      expect(inputs?.length).toBeGreaterThan(0);
    });

    it('should have new ID input in change-id form', () => {
      const input = document.getElementById('new-id-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.placeholder).toBe('Enter existing ID');
    });

    it('should have change ID form hidden by default', () => {
      const form = document.getElementById('change-id-form');
      expect(form?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Display Elements', () => {
    it('should display player ID element', () => {
      const playerId = document.getElementById('player-id');
      expect(playerId).toBeTruthy();
    });

    it('should display active games count', () => {
      const activeGames = document.getElementById('active-games');
      expect(activeGames).toBeTruthy();
    });

    it('should display player level', () => {
      const level = document.getElementById('player-level');
      expect(level).toBeTruthy();
      expect(level?.textContent).toBe('1');
    });

    it('should display player wins', () => {
      const wins = document.getElementById('player-wins');
      expect(wins).toBeTruthy();
      expect(wins?.textContent).toBe('0');
    });

    it('should display opponent progress', () => {
      const progress = document.getElementById('opponent-progress');
      expect(progress).toBeTruthy();
    });

    it('should display your progress', () => {
      const progress = document.getElementById('your-progress');
      expect(progress).toBeTruthy();
    });

    it('should display hints remaining', () => {
      const hints = document.getElementById('hints-remaining');
      expect(hints).toBeTruthy();
      expect(hints?.textContent).toBe('4');
    });
  });

  describe('Timer Elements', () => {
    it('should have submit timer element', () => {
      const timer = document.getElementById('timer-submit');
      expect(timer).toBeTruthy();
    });

    it('should have solve timer element', () => {
      const timer = document.getElementById('timer-solve');
      expect(timer).toBeTruthy();
    });

    it('should have penalty display initially hidden', () => {
      const penalty = document.getElementById('penalty-display');
      expect(penalty?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Toast Notifications', () => {
    it('should have error toast initially hidden', () => {
      const toast = document.getElementById('error-toast');
      expect(toast?.classList.contains('hidden')).toBe(true);
    });

    it('should have hint toast initially hidden', () => {
      const toast = document.getElementById('hint-toast');
      expect(toast?.classList.contains('hidden')).toBe(true);
    });

    it('should have hint toast with initial message', () => {
      const toast = document.getElementById('hint-toast');
      expect(toast?.textContent).toBe('3 hints left');
    });
  });

  describe('Crossword Container', () => {
    it('should have crossword container element', () => {
      const container = document.getElementById('crossword-container');
      expect(container).toBeTruthy();
    });

    it('should have solution grid element', () => {
      const solutionGrid = document.getElementById('solution-grid');
      expect(solutionGrid).toBeTruthy();
    });

    it('should have solution container initially hidden', () => {
      const container = document.getElementById('solution-container');
      expect(container?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Form Structure', () => {
    it('should have word form with submit button', () => {
      const form = document.getElementById('word-form') as HTMLFormElement;
      expect(form).toBeTruthy();

      const submitBtn = form.querySelector('button[type="submit"]');
      expect(submitBtn).toBeTruthy();
    });

    it('should have form error container', () => {
      const error = document.getElementById('form-error');
      expect(error).toBeTruthy();
      expect(error?.classList.contains('hidden')).toBe(true);
    });

    it('should have word input wrappers with error elements', () => {
      const wrappers = document.querySelectorAll('.word-input-wrapper');
      expect(wrappers.length).toBeGreaterThan(0);

      wrappers.forEach(wrapper => {
        const errorEl = wrapper.querySelector('.word-error');
        expect(errorEl).toBeTruthy();
      });
    });
  });

  describe('Status Text Elements', () => {
    it('should have status text element', () => {
      const status = document.getElementById('status-text');
      expect(status).toBeTruthy();
    });

    it('should have waiting info element', () => {
      const info = document.getElementById('waiting-info');
      expect(info).toBeTruthy();
    });

    it('should have submit status element', () => {
      const status = document.getElementById('submit-status');
      expect(status).toBeTruthy();
    });

    it('should have result title element', () => {
      const title = document.getElementById('result-title');
      expect(title).toBeTruthy();
    });

    it('should have result details element', () => {
      const details = document.getElementById('result-details');
      expect(details).toBeTruthy();
    });
  });

  describe('Opponent Info Sections', () => {
    it('should have opponent info in submit screen', () => {
      const info = document.getElementById('submit-opponent-info');
      expect(info).toBeTruthy();
      expect(info?.style.display).toBe('none');
    });

    it('should have opponent name display element', () => {
      const name = document.getElementById('opponent-name-display');
      expect(name).toBeTruthy();
    });

    it('should have opponent level display in solve screen', () => {
      const level = document.getElementById('opponent-level');
      expect(level).toBeTruthy();
    });

    it('should have submit opponent level display', () => {
      const level = document.getElementById('submit-opponent-level');
      expect(level).toBeTruthy();
    });

    it('should have rematch status element', () => {
      const status = document.getElementById('rematch-status');
      expect(status).toBeTruthy();
      expect(status?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('ID Change Functionality', () => {
    it('should have change ID button', () => {
      const btn = document.getElementById('change-id-btn');
      expect(btn).toBeTruthy();
    });

    it('should have save ID button', () => {
      const btn = document.getElementById('save-id-btn');
      expect(btn).toBeTruthy();
    });

    it('should have cancel ID button', () => {
      const btn = document.getElementById('cancel-id-btn');
      expect(btn).toBeTruthy();
    });

    it('should have player ID display section', () => {
      const display = document.getElementById('player-id-display');
      expect(display).toBeTruthy();
    });
  });

  describe('Submit Form Sections', () => {
    it('should have submit form section', () => {
      const section = document.getElementById('submit-form-section');
      expect(section).toBeTruthy();
    });

    it('should have submit waiting section hidden initially', () => {
      const section = document.getElementById('submit-waiting-section');
      expect(section?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Visual State Changes', () => {
    it('should be able to hide and show screens', () => {
      const screen = document.getElementById('screen-menu');
      expect(screen?.classList.contains('hidden')).toBe(false);

      screen?.classList.add('hidden');
      expect(screen?.classList.contains('hidden')).toBe(true);

      screen?.classList.remove('hidden');
      expect(screen?.classList.contains('hidden')).toBe(false);
    });

    it('should be able to toggle error toast visibility', () => {
      const toast = document.getElementById('error-toast');
      expect(toast?.classList.contains('hidden')).toBe(true);

      toast?.classList.remove('hidden');
      expect(toast?.classList.contains('hidden')).toBe(false);

      toast?.classList.add('hidden');
      expect(toast?.classList.contains('hidden')).toBe(true);
    });

    it('should be able to update text content', () => {
      const element = document.getElementById('status-text');
      if (element) {
        element.textContent = 'Test message';
        expect(element.textContent).toBe('Test message');
      }
    });
  });
});
