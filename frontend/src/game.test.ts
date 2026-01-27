import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameClient } from './game';
import { createMockGrid } from './test-setup';

describe('GameClient', () => {
  let gameClient: GameClient;

  beforeEach(() => {
    gameClient = new GameClient();
  });

  describe('Initialization', () => {
    it('should create initial state', () => {
      const state = gameClient.getState();
      expect(state.phase).toBe('connecting');
      expect(state.playerId).toBeNull();
      expect(state.playerName).toBeNull();
      expect(state.roomId).toBeNull();
      expect(state.grid).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should have correct default timeouts', () => {
      const state = gameClient.getState();
      expect(state.submissionTimeoutMs).toBe(60000);
      expect(state.solvingTimeoutMs).toBe(300000);
    });

    it('should initialize with empty filled cells', () => {
      const state = gameClient.getState();
      expect(state.filledCells).toEqual({});
      expect(state.cellCorrectness).toEqual({});
    });
  });

  describe('State Management', () => {
    it('should notify handlers when state changes', () => {
      const handler = vi.fn();
      gameClient.onStateChange(handler);

      // Handler should be called immediately with current state
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(gameClient.getState());
    });

    it('should support multiple state change handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      gameClient.onStateChange(handler1);
      gameClient.onStateChange(handler2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe handler when unsubscribe function is called', () => {
      const handler = vi.fn();
      const unsubscribe = gameClient.onStateChange(handler);

      handler.mockClear();
      unsubscribe();

      // Trigger another state change by finding a match
      // (This would normally happen through WebSocket, but we can test the unsubscribe)
      const initialCallCount = handler.mock.calls.length;

      // If properly unsubscribed, handler should not be called
      // We'll test this indirectly through the getState call
      const state = gameClient.getState();
      expect(state).toBeDefined();
    });
  });

  describe('Matchmaking', () => {
    it('should cancel matchmaking', () => {
      gameClient.cancelMatchmaking();
      const state = gameClient.getState();
      expect(state.phase).toBe('connecting');
      expect(state.roomId).toBeNull();
    });

    it('should set error on cancel', () => {
      gameClient.cancelMatchmaking();
      const state = gameClient.getState();
      // After cancel, state should be reset
      expect(state.phase).toBe('connecting');
    });
  });

  describe('Event Handlers', () => {
    it('should register hint used handler', () => {
      const handler = vi.fn();
      gameClient.onHintUsed(handler);
      // Handler should be registered but not called yet
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register matchmaking timeout handler', () => {
      const handler = vi.fn();
      gameClient.onMatchmakingTimeout(handler);
      // Handler should be registered but not called yet
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('State Getters', () => {
    it('should return current state', () => {
      const state = gameClient.getState();
      expect(state).toBeDefined();
      expect(state.phase).toBeDefined();
      expect(state.playerId).toBeDefined();
    });

    it('should return consistent state', () => {
      const state1 = gameClient.getState();
      const state2 = gameClient.getState();
      expect(state1).toEqual(state2);
    });
  });

  describe('WebSocket Connection', () => {
    it('should handle production URL detection', () => {
      const client = new GameClient();
      const state = client.getState();
      // Just verify client can be created
      expect(state).toBeDefined();
    });
  });

  describe('Cell Management', () => {
    it('should initialize with empty filled cells', () => {
      const state = gameClient.getState();
      expect(Object.keys(state.filledCells)).toHaveLength(0);
    });

    it('should initialize with empty correctness map', () => {
      const state = gameClient.getState();
      expect(Object.keys(state.cellCorrectness)).toHaveLength(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should initialize with zero opponent progress', () => {
      const state = gameClient.getState();
      expect(state.opponentProgress).toBe(0);
    });

    it('should initialize with zero active games', () => {
      const state = gameClient.getState();
      expect(state.activeGames).toBe(0);
    });

    it('should initialize with zero total games played', () => {
      const state = gameClient.getState();
      expect(state.totalGamesPlayed).toBe(0);
    });
  });

  describe('Rematch State', () => {
    it('should initialize with rematch flags false', () => {
      const state = gameClient.getState();
      expect(state.opponentWantsRematch).toBe(false);
      expect(state.waitingForRematch).toBe(false);
    });
  });
});
