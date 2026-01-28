import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Matchmaking } from './Matchmaking';
import { MockDurableObjectState, MockWebSocket, createMockEnv } from './test-setup';

// Helper to simulate a WebSocket connection and get the server-side socket
async function connectPlayer(matchmaking: Matchmaking): Promise<{ messages: any[]; simulateMessage: (msg: any) => void; close: () => void }> {
  const messages: any[] = [];

  // Create a mock WebSocketPair
  const mockClient = new MockWebSocket();
  const mockServer = new MockWebSocket();

  // Override WebSocketPair to return our mocks
  const originalWebSocketPair = (globalThis as any).WebSocketPair;
  (globalThis as any).WebSocketPair = function() {
    return { 0: mockClient, 1: mockServer };
  };

  // Intercept messages sent to the server socket
  const originalSend = mockServer.send.bind(mockServer);
  mockServer.send = (data: string) => {
    messages.push(JSON.parse(data));
    originalSend(data);
  };

  // Make the WebSocket request
  const request = new Request('https://matchmaking/', {
    headers: { 'Upgrade': 'websocket' },
  });

  await matchmaking.fetch(request);

  // Restore original WebSocketPair
  (globalThis as any).WebSocketPair = originalWebSocketPair;

  return {
    messages,
    simulateMessage: (msg: any) => {
      // Trigger the message event listener on the server socket
      const handlers = (mockServer as any).eventListeners.get('message');
      if (handlers) {
        handlers.forEach((handler: Function) => {
          handler(new MessageEvent('message', { data: JSON.stringify(msg) }));
        });
      }
    },
    close: () => {
      // Trigger the close event
      const handlers = (mockServer as any).eventListeners.get('close');
      if (handlers) {
        handlers.forEach((handler: Function) => {
          handler(new CloseEvent('close'));
        });
      }
    },
  };
}

describe('Matchmaking', () => {
  let matchmaking: Matchmaking;
  let mockState: MockDurableObjectState;

  beforeEach(async () => {
    mockState = new MockDurableObjectState();
    matchmaking = new Matchmaking(mockState, createMockEnv());
    // Wait for blockConcurrencyWhile to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('HTTP Endpoints', () => {
    describe('GET / (stats)', () => {
      it('should return initial stats', async () => {
        const response = await matchmaking.fetch(new Request('https://matchmaking/'));
        const data = await response.json() as any;

        expect(response.status).toBe(200);
        expect(data.queueSize).toBe(0);
        expect(data.onlineCount).toBe(0);
        expect(data.activeGames).toBe(0);
      });
    });

    describe('POST /game-started', () => {
      it('should increment active games count', async () => {
        const response = await matchmaking.fetch(
          new Request('https://matchmaking/game-started', { method: 'POST' })
        );
        const data = await response.json() as { activeGames: number };

        expect(response.status).toBe(200);
        expect(data.activeGames).toBe(1);

        // Verify it persisted
        const stored = await mockState.storage.get<number>('activeGames');
        expect(stored).toBe(1);
      });

      it('should accumulate multiple game starts', async () => {
        await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));
        await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));
        const response = await matchmaking.fetch(
          new Request('https://matchmaking/game-started', { method: 'POST' })
        );
        const data = await response.json() as { activeGames: number };

        expect(data.activeGames).toBe(3);
      });
    });

    describe('POST /game-ended', () => {
      it('should decrement active games and increment total played', async () => {
        // Start a game first
        await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));

        // End the game
        const response = await matchmaking.fetch(
          new Request('https://matchmaking/game-ended', { method: 'POST' })
        );
        const data = await response.json() as { activeGames: number; totalGamesPlayed: number };

        expect(data.activeGames).toBe(0);
        expect(data.totalGamesPlayed).toBe(1);
      });

      it('should not go below zero active games', async () => {
        // End game without starting one
        const response = await matchmaking.fetch(
          new Request('https://matchmaking/game-ended', { method: 'POST' })
        );
        const data = await response.json() as { activeGames: number };

        expect(data.activeGames).toBe(0);
      });

      it('should persist both counts', async () => {
        await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));
        await matchmaking.fetch(new Request('https://matchmaking/game-ended', { method: 'POST' }));

        expect(await mockState.storage.get<number>('activeGames')).toBe(0);
        expect(await mockState.storage.get<number>('totalGamesPlayed')).toBe(1);
      });
    });

    describe('POST /bot-game-ended', () => {
      it('should increment total games played without affecting active games', async () => {
        await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));

        const response = await matchmaking.fetch(
          new Request('https://matchmaking/bot-game-ended', { method: 'POST' })
        );
        const data = await response.json() as { totalGamesPlayed: number };

        expect(data.totalGamesPlayed).toBe(1);

        // Active games should be unchanged
        const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
        const statsData = await stats.json() as any;
        expect(statsData.activeGames).toBe(1);
      });
    });

    describe('POST /player-registered', () => {
      it('should increment total players count', async () => {
        const response = await matchmaking.fetch(
          new Request('https://matchmaking/player-registered', { method: 'POST' })
        );
        const data = await response.json() as { totalPlayers: number };

        // Initial count is 10, so after one registration it should be 11
        expect(data.totalPlayers).toBe(11);
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should send welcome message with stats on connect', async () => {
      const { messages } = await connectPlayer(matchmaking);

      expect(messages.length).toBeGreaterThanOrEqual(1);
      const welcome = messages.find(m => m.type === 'welcome');
      expect(welcome).toBeDefined();
      expect(welcome.playerId).toBeDefined();
      expect(welcome.playerName).toBeDefined();
      expect(welcome.queueSize).toBe(0);
      expect(welcome.onlineCount).toBe(1);
    });

    it('should track online count correctly', async () => {
      const player1 = await connectPlayer(matchmaking);
      const player2 = await connectPlayer(matchmaking);

      // Both players should see updated online count
      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.onlineCount).toBe(2);

      // Disconnect player 1
      player1.close();

      const stats2 = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data2 = await stats2.json() as any;
      expect(data2.onlineCount).toBe(1);
    });
  });

  describe('Queue Management', () => {
    it('should add player to queue when join-queue message sent', async () => {
      const { messages, simulateMessage } = await connectPlayer(matchmaking);
      messages.length = 0; // Clear welcome message

      simulateMessage({ type: 'join-queue' });

      const queueJoined = messages.find(m => m.type === 'queue-joined');
      expect(queueJoined).toBeDefined();
      expect(queueJoined.position).toBe(1);

      // Verify queue size
      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.queueSize).toBe(1);
    });

    it('should remove player from queue when leave-queue message sent', async () => {
      const { simulateMessage } = await connectPlayer(matchmaking);

      simulateMessage({ type: 'join-queue' });
      simulateMessage({ type: 'leave-queue' });

      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.queueSize).toBe(0);
    });

    it('should remove player from queue on disconnect', async () => {
      const { simulateMessage, close } = await connectPlayer(matchmaking);

      simulateMessage({ type: 'join-queue' });

      // Verify in queue
      let stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      let data = await stats.json() as any;
      expect(data.queueSize).toBe(1);

      // Disconnect
      close();

      // Verify removed from queue
      stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      data = await stats.json() as any;
      expect(data.queueSize).toBe(0);
    });

    it('should not add player to queue twice', async () => {
      const { simulateMessage } = await connectPlayer(matchmaking);

      simulateMessage({ type: 'join-queue' });
      simulateMessage({ type: 'join-queue' }); // Duplicate

      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.queueSize).toBe(1);
    });
  });

  describe('Matchmaking', () => {
    it('should match two players when both join queue', async () => {
      const player1 = await connectPlayer(matchmaking);
      const player2 = await connectPlayer(matchmaking);

      player1.messages.length = 0;
      player2.messages.length = 0;

      player1.simulateMessage({ type: 'join-queue' });
      player2.simulateMessage({ type: 'join-queue' });

      // Both should receive match-found
      const match1 = player1.messages.find(m => m.type === 'match-found');
      const match2 = player2.messages.find(m => m.type === 'match-found');

      expect(match1).toBeDefined();
      expect(match2).toBeDefined();
      expect(match1.roomId).toBe(match2.roomId);
      expect(match1.opponent.id).toBe(match2.roomId ? player2.messages.find(m => m.type === 'welcome')?.playerId : undefined);
    });

    it('should increment active games when match is made', async () => {
      const player1 = await connectPlayer(matchmaking);
      const player2 = await connectPlayer(matchmaking);

      player1.simulateMessage({ type: 'join-queue' });
      player2.simulateMessage({ type: 'join-queue' });

      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.activeGames).toBe(1);
    });

    it('should clear queue after match', async () => {
      const player1 = await connectPlayer(matchmaking);
      const player2 = await connectPlayer(matchmaking);

      player1.simulateMessage({ type: 'join-queue' });
      player2.simulateMessage({ type: 'join-queue' });

      const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
      const data = await stats.json() as any;
      expect(data.queueSize).toBe(0);
    });
  });

  describe('Stats Broadcasting', () => {
    it('should broadcast stats updates to all connected players', async () => {
      const player1 = await connectPlayer(matchmaking);
      const player2 = await connectPlayer(matchmaking);

      player1.messages.length = 0;
      player2.messages.length = 0;

      // Trigger a stats update by starting a game
      await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));

      // Both players should receive stats-update
      const update1 = player1.messages.find(m => m.type === 'stats-update');
      const update2 = player2.messages.find(m => m.type === 'stats-update');

      expect(update1).toBeDefined();
      expect(update2).toBeDefined();
      expect(update1.activeGames).toBe(1);
    });
  });

  describe('Persistence', () => {
    it('should restore stats from storage on restart', async () => {
      // Set up initial state
      await mockState.storage.put('activeGames', 5);
      await mockState.storage.put('totalGamesPlayed', 100);
      await mockState.storage.put('totalPlayers', 50);

      // Create new instance (simulating restart)
      const newMatchmaking = new Matchmaking(mockState, createMockEnv());
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for blockConcurrencyWhile

      const response = await newMatchmaking.fetch(new Request('https://matchmaking/'));
      const data = await response.json() as any;

      expect(data.activeGames).toBe(5);
      expect(data.totalGamesPlayed).toBe(100);
      expect(data.totalPlayers).toBe(50);
    });
  });
});
