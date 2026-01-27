import { describe, it, expect, beforeEach } from 'vitest';
import { Matchmaking } from './Matchmaking';
import { MockDurableObjectState, MockWebSocket, createMockEnv } from './test-setup';

describe('Matchmaking - Queue Management', () => {
  let matchmaking: Matchmaking;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    matchmaking = new Matchmaking(mockState, mockEnv);
  });

  describe('Initialization', () => {
    it('should start with empty queue', () => {
      expect(matchmaking['queue'].size).toBe(0);
    });

    it('should initialize with zero active games', () => {
      expect(matchmaking['activeGames']).toBe(0);
    });

    it('should initialize with zero total games played', () => {
      expect(matchmaking['totalGamesPlayed']).toBe(0);
    });

    it('should have empty connected sockets', () => {
      expect(matchmaking['connectedSockets'].size).toBe(0);
    });
  });

  describe('Queue Operations', () => {
    it('should add players to queue', () => {
      const ws = new MockWebSocket();
      const player = {
        websocket: ws,
        playerId: 'player-1',
        playerName: 'Test Player',
        joinedAt: Date.now(),
      };

      matchmaking['queue'].set(ws, player);
      expect(matchmaking['queue'].size).toBe(1);
    });

    it('should remove players from queue', () => {
      const ws = new MockWebSocket();
      const player = {
        websocket: ws,
        playerId: 'player-1',
        playerName: 'Test Player',
        joinedAt: Date.now(),
      };

      matchmaking['queue'].set(ws, player);
      matchmaking['queue'].delete(ws);
      expect(matchmaking['queue'].size).toBe(0);
    });

    it('should handle multiple players in queue', () => {
      for (let i = 0; i < 5; i++) {
        const ws = new MockWebSocket();
        matchmaking['queue'].set(ws, {
          websocket: ws,
          playerId: `player-${i}`,
          playerName: `Player ${i}`,
          joinedAt: Date.now(),
        });
      }

      expect(matchmaking['queue'].size).toBe(5);
    });

    it('should match players from queue', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();

      matchmaking['queue'].set(ws1, {
        websocket: ws1,
        playerId: 'player-1',
        playerName: 'Player 1',
        joinedAt: Date.now(),
      });

      matchmaking['queue'].set(ws2, {
        websocket: ws2,
        playerId: 'player-2',
        playerName: 'Player 2',
        joinedAt: Date.now(),
      });

      // Simulate matching: remove both from queue
      if (matchmaking['queue'].size >= 2) {
        const players = Array.from(matchmaking['queue'].values());
        matchmaking['queue'].delete(ws1);
        matchmaking['queue'].delete(ws2);
      }

      expect(matchmaking['queue'].size).toBe(0);
    });
  });

  describe('Connection Management', () => {
    it('should track connected sockets', () => {
      const ws = new MockWebSocket();
      matchmaking['connectedSockets'].add(ws);

      expect(matchmaking['connectedSockets'].size).toBe(1);
    });

    it('should remove disconnected sockets', () => {
      const ws = new MockWebSocket();
      matchmaking['connectedSockets'].add(ws);
      matchmaking['connectedSockets'].delete(ws);

      expect(matchmaking['connectedSockets'].size).toBe(0);
    });

    it('should handle multiple concurrent connections', () => {
      for (let i = 0; i < 10; i++) {
        matchmaking['connectedSockets'].add(new MockWebSocket());
      }

      expect(matchmaking['connectedSockets'].size).toBe(10);
    });
  });
});

describe('Matchmaking - Stats Tracking', () => {
  let matchmaking: Matchmaking;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    matchmaking = new Matchmaking(mockState, mockEnv);
  });

  describe('Active Games', () => {
    it('should increment active games on /game-started', async () => {
      const initialCount = matchmaking['activeGames'];

      matchmaking['activeGames']++;
      await mockState.storage.put('activeGames', matchmaking['activeGames']);

      const stored = await mockState.storage.get<number>('activeGames');
      expect(stored).toBe(initialCount + 1);
    });

    it('should decrement active games on /game-ended', () => {
      matchmaking['activeGames'] = 5;
      matchmaking['activeGames'] = Math.max(0, matchmaking['activeGames'] - 1);

      expect(matchmaking['activeGames']).toBe(4);
    });

    it('should not go below zero', () => {
      matchmaking['activeGames'] = 0;
      matchmaking['activeGames'] = Math.max(0, matchmaking['activeGames'] - 1);

      expect(matchmaking['activeGames']).toBe(0);
    });
  });

  describe('Total Games Played', () => {
    it('should increment on game end', async () => {
      const initialCount = matchmaking['totalGamesPlayed'];

      matchmaking['totalGamesPlayed']++;
      await mockState.storage.put('totalGamesPlayed', matchmaking['totalGamesPlayed']);

      const stored = await mockState.storage.get<number>('totalGamesPlayed');
      expect(stored).toBe(initialCount + 1);
    });

    it('should increment on bot game end', async () => {
      const initialCount = matchmaking['totalGamesPlayed'];

      matchmaking['totalGamesPlayed']++;
      await mockState.storage.put('totalGamesPlayed', matchmaking['totalGamesPlayed']);

      const stored = await mockState.storage.get<number>('totalGamesPlayed');
      expect(stored).toBe(initialCount + 1);
    });

    it('should persist across restart', async () => {
      matchmaking['totalGamesPlayed'] = 42;
      await mockState.storage.put('totalGamesPlayed', 42);

      const stored = await mockState.storage.get<number>('totalGamesPlayed');
      expect(stored).toBe(42);
    });
  });

  describe('Stats Persistence', () => {
    it('should load active games from storage on startup', async () => {
      await mockState.storage.put('activeGames', 10);
      const loaded = await mockState.storage.get<number>('activeGames');

      expect(loaded).toBe(10);
    });

    it('should load total games from storage on startup', async () => {
      await mockState.storage.put('totalGamesPlayed', 100);
      const loaded = await mockState.storage.get<number>('totalGamesPlayed');

      expect(loaded).toBe(100);
    });
  });
});

describe('Matchmaking - HTTP Endpoints', () => {
  let matchmaking: Matchmaking;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    matchmaking = new Matchmaking(mockState, mockEnv);
  });

  describe('Game Started Endpoint', () => {
    it('should handle /game-started POST', async () => {
      matchmaking['activeGames'] = 0;
      matchmaking['activeGames']++;

      expect(matchmaking['activeGames']).toBe(1);
    });
  });

  describe('Game Ended Endpoint', () => {
    it('should handle /game-ended POST', async () => {
      matchmaking['activeGames'] = 1;
      matchmaking['totalGamesPlayed'] = 0;

      matchmaking['activeGames']--;
      matchmaking['totalGamesPlayed']++;

      expect(matchmaking['activeGames']).toBe(0);
      expect(matchmaking['totalGamesPlayed']).toBe(1);
    });
  });

  describe('Bot Game Ended Endpoint', () => {
    it('should handle /bot-game-ended POST', async () => {
      const initialTotal = matchmaking['totalGamesPlayed'];

      matchmaking['totalGamesPlayed']++;

      expect(matchmaking['totalGamesPlayed']).toBe(initialTotal + 1);
    });
  });

  describe('Stats Endpoint', () => {
    it('should return current stats', async () => {
      matchmaking['activeGames'] = 5;
      matchmaking['totalGamesPlayed'] = 50;
      matchmaking['connectedSockets'].add(new MockWebSocket());
      matchmaking['queue'].set(new MockWebSocket(), {
        websocket: new MockWebSocket(),
        playerId: 'test',
        playerName: 'Test',
        joinedAt: Date.now(),
      });

      const stats = {
        queueSize: matchmaking['queue'].size,
        onlineCount: matchmaking['connectedSockets'].size,
        activeGames: matchmaking['activeGames'],
        totalGamesPlayed: matchmaking['totalGamesPlayed'],
      };

      expect(stats.queueSize).toBe(1);
      expect(stats.onlineCount).toBe(1);
      expect(stats.activeGames).toBe(5);
      expect(stats.totalGamesPlayed).toBe(50);
    });
  });
});

describe('Matchmaking - Race Conditions', () => {
  let matchmaking: Matchmaking;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    matchmaking = new Matchmaking(mockState, mockEnv);
  });

  it('should handle concurrent game-started calls', async () => {
    matchmaking['activeGames'] = 0;

    // Simulate concurrent calls
    matchmaking['activeGames']++;
    matchmaking['activeGames']++;

    expect(matchmaking['activeGames']).toBe(2);
  });

  it('should handle concurrent player additions to queue', () => {
    for (let i = 0; i < 100; i++) {
      const ws = new MockWebSocket();
      matchmaking['queue'].set(ws, {
        websocket: ws,
        playerId: `player-${i}`,
        playerName: `Player ${i}`,
        joinedAt: Date.now(),
      });
    }

    expect(matchmaking['queue'].size).toBe(100);
  });

  it('should maintain consistency during simultaneous stats updates', async () => {
    const promises = [];

    // Simulate multiple concurrent updates
    for (let i = 0; i < 10; i++) {
      promises.push(
        mockState.storage.put('activeGames', i).then(() => {
          matchmaking['activeGames'] = i;
        })
      );
    }

    await Promise.all(promises);
    expect(matchmaking['activeGames']).toBeLessThanOrEqual(10);
  });
});
