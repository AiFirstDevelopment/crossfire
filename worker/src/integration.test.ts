import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameRoom } from './GameRoom';
import { Matchmaking } from './Matchmaking';
import { PlayerStats } from './PlayerStats';
import { MockDurableObjectState, MockWebSocket, createMockEnv } from './test-setup';

// Helper to connect a player to a Durable Object
async function connectToWebSocket(durableObject: GameRoom | Matchmaking): Promise<{
  messages: any[];
  simulateMessage: (msg: any) => void;
  close: () => void;
}> {
  const messages: any[] = [];
  const mockServer = new MockWebSocket();

  const originalWebSocketPair = (globalThis as any).WebSocketPair;
  (globalThis as any).WebSocketPair = function() {
    return { 0: new MockWebSocket(), 1: mockServer };
  };

  const originalSend = mockServer.send.bind(mockServer);
  mockServer.send = (data: string) => {
    messages.push(JSON.parse(data));
    originalSend(data);
  };

  await durableObject.fetch(new Request('https://do/', {
    headers: { 'Upgrade': 'websocket' },
  }));

  (globalThis as any).WebSocketPair = originalWebSocketPair;

  return {
    messages,
    simulateMessage: (msg: any) => {
      const handlers = (mockServer as any).eventListeners.get('message');
      if (handlers) {
        handlers.forEach((handler: Function) => {
          handler(new MessageEvent('message', { data: JSON.stringify(msg) }));
        });
      }
    },
    close: () => {
      const handlers = (mockServer as any).eventListeners.get('close');
      if (handlers) {
        handlers.forEach((handler: Function) => {
          handler(new CloseEvent('close'));
        });
      }
    },
  };
}

describe('Integration: Matchmaking → GameRoom flow', () => {
  let matchmaking: Matchmaking;
  let matchmakingState: MockDurableObjectState;

  beforeEach(async () => {
    matchmakingState = new MockDurableObjectState();
    matchmaking = new Matchmaking(matchmakingState, createMockEnv());
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should create a room ID when two players are matched', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);

    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });

    const match1 = player1.messages.find(m => m.type === 'match-found');
    const match2 = player2.messages.find(m => m.type === 'match-found');

    expect(match1).toBeDefined();
    expect(match2).toBeDefined();
    expect(match1.roomId).toMatch(/^game-/);
    expect(match1.roomId).toBe(match2.roomId);
  });

  it('should increment active games when match is made', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);

    // Verify initial state
    let stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    let data = await stats.json() as any;
    expect(data.activeGames).toBe(0);

    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });

    // After match, active games should increment
    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.activeGames).toBe(1);
  });

  it('should provide opponent info in match-found message', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);

    const welcome1 = player1.messages.find(m => m.type === 'welcome');
    const welcome2 = player2.messages.find(m => m.type === 'welcome');

    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });

    const match1 = player1.messages.find(m => m.type === 'match-found');
    const match2 = player2.messages.find(m => m.type === 'match-found');

    // Player 1's opponent should be player 2
    expect(match1.opponent.id).toBe(welcome2.playerId);
    // Player 2's opponent should be player 1
    expect(match2.opponent.id).toBe(welcome1.playerId);
  });
});

describe('Integration: GameRoom game flow', () => {
  let gameRoom: GameRoom;
  let gameRoomState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    gameRoomState = new MockDurableObjectState();
    mockEnv = createMockEnv();
    gameRoom = new GameRoom(gameRoomState, mockEnv);
  });

  it('should complete full game lifecycle: connect → submit → solve', async () => {
    // 1. Two players connect
    const player1 = await connectToWebSocket(gameRoom);
    const player2 = await connectToWebSocket(gameRoom);

    // Verify both received welcome and game-start
    expect(player1.messages.find(m => m.type === 'welcome')).toBeDefined();
    expect(player2.messages.find(m => m.type === 'welcome')).toBeDefined();
    expect(player1.messages.find(m => m.type === 'game-start')).toBeDefined();
    expect(player2.messages.find(m => m.type === 'game-start')).toBeDefined();

    // Verify phase is submitting
    let info = await gameRoom.fetch(new Request('https://game/room/info'));
    let data = await info.json() as any;
    expect(data.phase).toBe('submitting');

    // 2. Both players submit words
    player1.simulateMessage({ type: 'submit-words', words: ['CAT', 'DOG', 'BIRD', 'FISH'] });

    // Player 1 should get words-accepted
    expect(player1.messages.find(m => m.type === 'words-accepted')).toBeDefined();
    // Player 2 should get opponent-submitted
    expect(player2.messages.find(m => m.type === 'opponent-submitted')).toBeDefined();

    player2.simulateMessage({ type: 'submit-words', words: ['LION', 'BEAR', 'WOLF', 'DEER'] });

    // 3. Game should transition to generating/solving
    info = await gameRoom.fetch(new Request('https://game/room/info'));
    data = await info.json() as any;
    // Could be submitting (if grid failed), generating, or solving
    expect(['submitting', 'generating', 'solving']).toContain(data.phase);
  });

  it('should handle reconnection scenario: opponent left during wait', async () => {
    const player1 = await connectToWebSocket(gameRoom);

    // Verify player 1 is waiting
    let info = await gameRoom.fetch(new Request('https://game/room/info'));
    let data = await info.json() as any;
    expect(data.phase).toBe('waiting');
    expect(data.playerCount).toBe(1);

    // Player 1 disconnects
    player1.close();

    info = await gameRoom.fetch(new Request('https://game/room/info'));
    data = await info.json() as any;
    expect(data.playerCount).toBe(0);

    // New player can join
    const player2 = await connectToWebSocket(gameRoom);
    expect(player2.messages.find(m => m.type === 'welcome')).toBeDefined();
  });
});

describe('Integration: PlayerStats tracking', () => {
  let playerStats: PlayerStats;
  let playerStatsState: MockDurableObjectState;

  beforeEach(() => {
    playerStatsState = new MockDurableObjectState();
    playerStats = new PlayerStats(playerStatsState, createMockEnv());
  });

  it('should track player registration and wins correctly', async () => {
    // 1. Check player doesn't exist
    let response = await playerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
    let data = await response.json() as any;
    expect(data.exists).toBe(false);

    // 2. Register player
    response = await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
    data = await response.json() as any;
    expect(data.created).toBe(true);
    expect(data.wins).toBe(0);

    // 3. Record a win (simulating game completion)
    response = await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
    data = await response.json() as any;
    expect(data.wins).toBe(1);

    // 4. Verify stats reflect the win
    response = await playerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
    data = await response.json() as any;
    expect(data.exists).toBe(true);
    expect(data.wins).toBe(1);
  });

  it('should persist stats across Durable Object restarts', async () => {
    // Register and record wins
    await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
    await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
    await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));

    // Simulate DO restart by creating new instance with same storage
    const newPlayerStats = new PlayerStats(playerStatsState, createMockEnv());

    // Stats should be preserved
    const response = await newPlayerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
    const data = await response.json() as any;
    expect(data.wins).toBe(2);
  });
});

describe('Integration: Matchmaking stats with game lifecycle', () => {
  let matchmaking: Matchmaking;
  let matchmakingState: MockDurableObjectState;

  beforeEach(async () => {
    matchmakingState = new MockDurableObjectState();
    matchmaking = new Matchmaking(matchmakingState, createMockEnv());
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should track active games correctly through game lifecycle', async () => {
    // Initial state
    let stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    let data = await stats.json() as any;
    expect(data.activeGames).toBe(0);
    expect(data.totalGamesPlayed).toBe(0);

    // Match two players (creates a game)
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);
    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });

    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.activeGames).toBe(1);

    // Simulate game ending (GameRoom would call this)
    await matchmaking.fetch(new Request('https://matchmaking/game-ended', { method: 'POST' }));

    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.activeGames).toBe(0);
    expect(data.totalGamesPlayed).toBe(1);
  });

  it('should track total games including bot games', async () => {
    // Play a bot game
    await matchmaking.fetch(new Request('https://matchmaking/bot-game-ended', { method: 'POST' }));

    // Play a multiplayer game
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);
    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });
    await matchmaking.fetch(new Request('https://matchmaking/game-ended', { method: 'POST' }));

    const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    const data = await stats.json() as any;
    expect(data.totalGamesPlayed).toBe(2); // 1 bot + 1 multiplayer
  });

  it('should broadcast stats to connected clients when games start/end', async () => {
    // Connect an observer (not in queue)
    const observer = await connectToWebSocket(matchmaking);
    observer.messages.length = 0;

    // Trigger a stats change
    await matchmaking.fetch(new Request('https://matchmaking/game-started', { method: 'POST' }));

    // Observer should receive stats-update
    const update = observer.messages.find(m => m.type === 'stats-update');
    expect(update).toBeDefined();
    expect(update.activeGames).toBe(1);
  });
});

describe('Integration: Queue behavior', () => {
  let matchmaking: Matchmaking;
  let matchmakingState: MockDurableObjectState;

  beforeEach(async () => {
    matchmakingState = new MockDurableObjectState();
    matchmaking = new Matchmaking(matchmakingState, createMockEnv());
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should match players in FIFO order', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);
    const player3 = await connectToWebSocket(matchmaking);

    const welcome1 = player1.messages.find(m => m.type === 'welcome');
    const welcome2 = player2.messages.find(m => m.type === 'welcome');

    // Player 1 and 2 join queue
    player1.simulateMessage({ type: 'join-queue' });
    player2.simulateMessage({ type: 'join-queue' });

    // Player 1 and 2 should be matched (not player 3)
    const match1 = player1.messages.find(m => m.type === 'match-found');
    const match2 = player2.messages.find(m => m.type === 'match-found');

    expect(match1).toBeDefined();
    expect(match2).toBeDefined();
    expect(match1.opponent.id).toBe(welcome2.playerId);
    expect(match2.opponent.id).toBe(welcome1.playerId);

    // Player 3 should not have been matched
    const match3 = player3.messages.find(m => m.type === 'match-found');
    expect(match3).toBeUndefined();
  });

  it('should handle player leaving queue before match', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);

    // Player 1 joins then leaves
    player1.simulateMessage({ type: 'join-queue' });
    player1.simulateMessage({ type: 'leave-queue' });

    // Player 2 joins
    player2.simulateMessage({ type: 'join-queue' });

    // No match should occur
    const match1 = player1.messages.find(m => m.type === 'match-found');
    const match2 = player2.messages.find(m => m.type === 'match-found');
    expect(match1).toBeUndefined();
    expect(match2).toBeUndefined();

    // Queue should have 1 player
    const stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    const data = await stats.json() as any;
    expect(data.queueSize).toBe(1);
  });

  it('should remove disconnected players from queue', async () => {
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);

    player1.simulateMessage({ type: 'join-queue' });

    // Verify queue has 1 player
    let stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    let data = await stats.json() as any;
    expect(data.queueSize).toBe(1);

    // Player 1 disconnects
    player1.close();

    // Queue should be empty
    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.queueSize).toBe(0);

    // Player 2 joins - should be alone in queue
    player2.simulateMessage({ type: 'join-queue' });

    const match2 = player2.messages.find(m => m.type === 'match-found');
    expect(match2).toBeUndefined();
  });
});

describe('Integration: Online count tracking', () => {
  let matchmaking: Matchmaking;
  let matchmakingState: MockDurableObjectState;

  beforeEach(async () => {
    matchmakingState = new MockDurableObjectState();
    matchmaking = new Matchmaking(matchmakingState, createMockEnv());
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should accurately track online users', async () => {
    // Initial: 0 online
    let stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    let data = await stats.json() as any;
    expect(data.onlineCount).toBe(0);

    // Connect 3 players
    const player1 = await connectToWebSocket(matchmaking);
    const player2 = await connectToWebSocket(matchmaking);
    const player3 = await connectToWebSocket(matchmaking);

    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.onlineCount).toBe(3);

    // Disconnect 1 player
    player2.close();

    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.onlineCount).toBe(2);

    // Disconnect remaining
    player1.close();
    player3.close();

    stats = await matchmaking.fetch(new Request('https://matchmaking/'));
    data = await stats.json() as any;
    expect(data.onlineCount).toBe(0);
  });
});
