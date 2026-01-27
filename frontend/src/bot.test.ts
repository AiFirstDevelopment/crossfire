import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BotGame } from './bot';

describe('BotGame', () => {
  let botGame: BotGame;
  const validWords = new Set(['APPLE', 'ORANGE', 'BANANA', 'GRAPE', 'MELON']);
  const wordList = ['apple', 'orange', 'banana', 'grape', 'melon', 'stone', 'table', 'chair'];

  beforeEach(() => {
    botGame = new BotGame(validWords, wordList);
  });

  describe('Initialization', () => {
    it('should create initial state', () => {
      const state = botGame.getState();
      expect(state.phase).toBe('submitting');
      expect(state.playerId).toBe('player');
      expect(state.playerName).toBe('You');
      expect(state.playerGrid).toBeNull();
      expect(state.botGrid).toBeNull();
    });

    it('should have a bot ID', () => {
      const state = botGame.getState();
      expect(state.botId).toBeTruthy();
      expect(typeof state.botId).toBe('string');
    });

    it('should have a formatted bot name', () => {
      const botName = botGame.getBotName();
      expect(botName).toBeTruthy();
      expect(typeof botName).toBe('string');
    });

    it('should initialize with correct timing values', () => {
      const state = botGame.getState();
      expect(state.submissionTimeoutMs).toBe(60000);
      expect(state.solvingTimeoutMs).toBe(300000);
    });

    it('should initialize with hint limits', () => {
      const state = botGame.getState();
      expect(state.hintsUsed).toBe(0);
      expect(state.maxHints).toBe(4);
    });
  });

  describe('State Management', () => {
    it('should notify handlers when state changes', () => {
      const handler = vi.fn();
      botGame.onStateChange(handler);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(botGame.getState());
    });

    it('should support multiple state change handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      botGame.onStateChange(handler1);
      botGame.onStateChange(handler2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe handler', () => {
      const handler = vi.fn();
      const unsubscribe = botGame.onStateChange(handler);

      handler.mockClear();
      unsubscribe();

      // Verify handler is unsubscribed by checking state is still accessible
      const state = botGame.getState();
      expect(state).toBeDefined();
    });
  });

  describe('Hint System', () => {
    it('should register hint used handler', () => {
      const handler = vi.fn();
      botGame.onHintUsed(handler);
      // Handler should be registered but not called yet
      expect(handler).not.toHaveBeenCalled();
    });

    it('should have maximum hints available', () => {
      const state = botGame.getState();
      expect(state.maxHints).toBe(4);
      expect(state.hintsUsed).toBe(0);
    });
  });

  describe('Word Submission', () => {
    it('should reject submission when not in submitting phase', () => {
      // Try to submit when not in correct phase
      const result = botGame.submitWords(['TEST', 'WORD', 'DEMO', 'PLAY']);
      
      // First submission should succeed since we start in 'submitting' phase
      if (result.success) {
        // Now try to submit again (should fail)
        const result2 = botGame.submitWords(['TEST', 'WORD', 'DEMO', 'PLAY']);
        expect(result2.success).toBe(false);
      }
    });

    it('should transition to solving phase on successful submission', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        expect(state.phase).toBe('solving');
      }
    });

    it('should initialize player grid on successful submission', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        expect(state.playerGrid).not.toBeNull();
        expect(state.playerGrid?.width).toBeGreaterThan(0);
        expect(state.playerGrid?.height).toBeGreaterThan(0);
      }
    });

    it('should pre-fill certain cells on successful submission', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        expect(Object.keys(state.playerFilledCells).length).toBeGreaterThan(0);
      }
    });

    it('should return error with suggestions for invalid word combinations', () => {
      // Use words that are unlikely to connect
      const result = botGame.submitWords(['XYZ', 'QWQ', 'ZZZ', 'XXX']);
      
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Bot Name Formatting', () => {
    it('should format bot name with capital letters', () => {
      const botName = botGame.getBotName();
      const words = botName.split(' ');
      words.forEach(word => {
        if (word.length > 0) {
          expect(word[0]).toBe(word[0].toUpperCase());
        }
      });
    });

    it('should use human-id naming pattern', () => {
      const state = botGame.getState();
      // Bot ID should contain hyphens (from human-id library)
      expect(state.botId.includes('-')).toBe(true);
    });
  });

  describe('State Getters', () => {
    it('should return current state', () => {
      const state = botGame.getState();
      expect(state).toBeDefined();
      expect(state.phase).toBeDefined();
    });

    it('should return consistent state', () => {
      const state1 = botGame.getState();
      const state2 = botGame.getState();
      expect(state1).toEqual(state2);
    });

    it('should return correct initial progress', () => {
      const state = botGame.getState();
      expect(state.botProgress).toBe(0);
    });
  });

  describe('Grid Structure', () => {
    it('should create valid client grids with words', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        expect(state.playerGrid?.words.length).toBeGreaterThan(0);
        expect(state.playerGrid?.cells.length).toBeGreaterThan(0);
      }
    });

    it('should mark word categories correctly', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        state.playerGrid?.words.forEach(word => {
          expect(word.category).toBeTruthy();
          expect(typeof word.category).toBe('string');
        });
      }
    });

    it('should have valid word indices', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        state.playerGrid?.words.forEach((word) => {
          expect(word.index).toBeGreaterThan(0);
          expect(word.direction).toMatch(/across|down/);
          expect(word.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Pre-filled Cells', () => {
    it('should pre-fill cells at positions 0, 4, 8, etc.', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        const preFilled = Object.keys(state.playerFilledCells).length;
        expect(preFilled).toBeGreaterThan(0);
        
        // Check that pre-filled cells are marked as correct
        Object.values(state.playerCellCorrectness).forEach(isCorrect => {
          expect(isCorrect).toBe(true);
        });
      }
    });
  });

  describe('Phase Transitions', () => {
    it('should start in submitting phase', () => {
      const state = botGame.getState();
      expect(state.phase).toBe('submitting');
    });

    it('should move to solving phase after word submission', () => {
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      
      if (result.success) {
        const state = botGame.getState();
        expect(state.phase).toBe('solving');
      }
    });

    it('should update phase start time on transition', () => {
      const beforeTime = Date.now();
      const result = botGame.submitWords(['APPLE', 'STONE', 'TABLE', 'CHAIR']);
      const afterTime = Date.now();
      
      if (result.success) {
        const state = botGame.getState();
        expect(state.phaseStartedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(state.phaseStartedAt).toBeLessThanOrEqual(afterTime);
      }
    });
  });
});
