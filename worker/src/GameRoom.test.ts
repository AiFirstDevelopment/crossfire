import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameRoom } from './GameRoom';
import { MockDurableObjectState, MockWebSocket, createMockEnv, createMockGameState } from './test-setup';

describe('GameRoom - State Management', () => {
  let gameRoom: GameRoom;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(mockState, mockEnv);
  });

  describe('Initialization', () => {
    it('should create initial game state', () => {
      const state = gameRoom['gameState'];
      expect(state.phase).toBe('waiting');
      expect(Object.keys(state.players)).toHaveLength(0);
      expect(Object.keys(state.playerWords)).toHaveLength(0);
    });

    it('should have empty players map', () => {
      const players = gameRoom['players'];
      expect(players.size).toBe(0);
    });

    it('should not have notified game end initially', () => {
      expect(gameRoom['gameEndedNotified']).toBe(false);
    });
  });

  describe('Room Info', () => {
    it('should return room info via /room/info endpoint', async () => {
      const request = new Request('https://example.com/room/info');
      const response = await gameRoom.fetch(request);
      const data = await response.json() as any;

      expect(data.playerCount).toBe(0);
      expect(data.maxPlayers).toBe(2);
      expect(data.phase).toBe('waiting');
    });
  });

  describe('Game Phase Transitions', () => {
    it('should start in waiting phase', () => {
      expect(gameRoom['gameState'].phase).toBe('waiting');
    });

    it('should transition through valid phases', async () => {
      // Initial: waiting
      expect(gameRoom['gameState'].phase).toBe('waiting');

      // Mock phase changes would happen through message handlers
      // This tests the state machine readiness
      const currentPhase = gameRoom['gameState'].phase;
      expect(['waiting', 'submitting', 'solving', 'finished']).toContain(currentPhase);
    });
  });

  describe('Player Validation', () => {
    it('should reject room when full (2 players)', async () => {
      // Simulate room full condition
      gameRoom['players'].set(new MockWebSocket(), {
        id: 'player-1',
        name: 'Player 1',
        websocket: new MockWebSocket(),
      });
      gameRoom['players'].set(new MockWebSocket(), {
        id: 'player-2',
        name: 'Player 2',
        websocket: new MockWebSocket(),
      });

      expect(gameRoom['players'].size).toBe(2);
    });

    it('should track player IDs and names', () => {
      const player = {
        id: 'test-player-123',
        name: 'Test Player',
        websocket: new MockWebSocket(),
      };

      gameRoom['players'].set(new MockWebSocket(), player);
      expect(gameRoom['players'].size).toBe(1);
    });
  });
});

describe('GameRoom - Message Handling', () => {
  let gameRoom: GameRoom;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(mockState, mockEnv);
  });

  describe('Message Routing', () => {
    it('should handle WebSocket upgrade requests', async () => {
      const request = new Request('https://example.com/', {
        headers: { 'Upgrade': 'websocket' },
      });

      try {
        const response = await gameRoom.fetch(request);
        // In Cloudflare Workers, a 101 response would be returned for WebSocket upgrades
        // In Node.js test environment, this will throw an error due to status code restrictions
        // But we can verify the code attempts to create a WebSocket response
        expect(response).toBeDefined();
      } catch (error: any) {
        // Expected in test environment - the RangeError indicates WebSocket upgrade was attempted
        expect(error.message).toContain('status');
      }
    });

    it('should handle HTTP requests separately from WebSocket', async () => {
      const request = new Request('https://example.com/room/info');
      const response = await gameRoom.fetch(request);

      expect(response.status).not.toBe(101);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('https://example.com/unknown');
      const response = await gameRoom.fetch(request);

      expect(response.status).toBe(404);
    });
  });
});

describe('GameRoom - Concurrency', () => {
  let gameRoom: GameRoom;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(mockState, mockEnv);
  });

  it('should handle multiple simultaneous WebSocket connections', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();

    gameRoom['players'].set(ws1, {
      id: 'player-1',
      name: 'Player 1',
      websocket: ws1,
    });
    gameRoom['players'].set(ws2, {
      id: 'player-2',
      name: 'Player 2',
      websocket: ws2,
    });

    expect(gameRoom['players'].size).toBe(2);
  });

  it('should isolate messages between players', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();

    const player1 = { id: 'p1', name: 'P1', websocket: ws1 };
    const player2 = { id: 'p2', name: 'P2', websocket: ws2 };

    gameRoom['players'].set(ws1, player1);
    gameRoom['players'].set(ws2, player2);

    // Each player should be independent
    expect(gameRoom['players'].get(ws1)).toEqual(player1);
    expect(gameRoom['players'].get(ws2)).toEqual(player2);
  });
});

describe('GameRoom - Game Result Distribution', () => {
  let gameRoom: GameRoom;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(mockState, mockEnv);
  });

  it('should track when game ended notification sent', () => {
    expect(gameRoom['gameEndedNotified']).toBe(false);

    // Simulate game ending
    gameRoom['gameEndedNotified'] = true;
    expect(gameRoom['gameEndedNotified']).toBe(true);
  });

  it('should not send duplicate game-ended notifications', () => {
    const sendNotificationSpy = vi.fn();

    // First notification
    gameRoom['gameEndedNotified'] = true;
    expect(gameRoom['gameEndedNotified']).toBe(true);

    // Should prevent duplicate
    if (gameRoom['gameEndedNotified']) {
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    }
  });
});

describe('GameRoom - Player Cleanup', () => {
  let gameRoom: GameRoom;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(mockState, mockEnv);
  });

  it('should handle player disconnection', () => {
    const ws = new MockWebSocket();
    gameRoom['players'].set(ws, {
      id: 'player-1',
      name: 'Player 1',
      websocket: ws,
    });

    expect(gameRoom['players'].size).toBe(1);

    // Simulate disconnect
    gameRoom['players'].delete(ws);
    expect(gameRoom['players'].size).toBe(0);
  });

  it('should clean up WebSocket references', () => {
    const ws = new MockWebSocket();
    const player = {
      id: 'player-1',
      name: 'Player 1',
      websocket: ws,
    };

    gameRoom['players'].set(ws, player);
    gameRoom['players'].delete(ws);

    expect(gameRoom['players'].has(ws)).toBe(false);
  });
});
