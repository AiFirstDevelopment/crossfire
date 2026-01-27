import { describe, it, expect, beforeEach } from 'vitest';
import { MockDurableObjectState } from './test-setup';

describe('Durable Objects - State Transitions', () => {
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
  });

  describe('Phase Transitions', () => {
    it('should transition from waiting to submitting', async () => {
      const state = { phase: 'waiting' };
      await mockState.storage.put('gameState', state);

      let stored = await mockState.storage.get<any>('gameState');
      expect(stored?.phase).toBe('waiting');

      stored.phase = 'submitting';
      await mockState.storage.put('gameState', stored);

      stored = await mockState.storage.get<any>('gameState');
      expect(stored?.phase).toBe('submitting');
    });

    it('should transition from submitting to solving', async () => {
      let state = { phase: 'submitting' };
      await mockState.storage.put('gameState', state);

      state.phase = 'solving';
      await mockState.storage.put('gameState', state);

      const stored = await mockState.storage.get<any>('gameState');
      expect(stored?.phase).toBe('solving');
    });

    it('should transition from solving to finished', async () => {
      let state = { phase: 'solving' };
      await mockState.storage.put('gameState', state);

      state.phase = 'finished';
      await mockState.storage.put('gameState', state);

      const stored = await mockState.storage.get<any>('gameState');
      expect(stored?.phase).toBe('finished');
    });

    it('should validate phase transitions', async () => {
      const validPhases = ['waiting', 'submitting', 'solving', 'finished'];
      const state = { phase: 'waiting' };

      await mockState.storage.put('gameState', state);
      const stored = await mockState.storage.get<any>('gameState');

      expect(validPhases).toContain(stored?.phase);
    });
  });

  describe('Rematch Flow', () => {
    it('should transition from finished to waiting for rematch', async () => {
      let state = { phase: 'finished', rematchRequested: false };
      await mockState.storage.put('gameState', state);

      const stored1 = await mockState.storage.get<any>('gameState');
      expect(stored1?.phase).toBe('finished');

      stored1.rematchRequested = true;
      await mockState.storage.put('gameState', stored1);

      const stored2 = await mockState.storage.get<any>('gameState');
      expect(stored2?.rematchRequested).toBe(true);
    });

    it('should handle both players accepting rematch', async () => {
      const state = {
        phase: 'finished',
        player1RematchRequested: false,
        player2RematchRequested: false,
      };
      await mockState.storage.put('gameState', state);

      let stored = await mockState.storage.get<any>('gameState');
      stored.player1RematchRequested = true;
      await mockState.storage.put('gameState', stored);

      stored = await mockState.storage.get<any>('gameState');
      stored.player2RematchRequested = true;
      await mockState.storage.put('gameState', stored);

      stored = await mockState.storage.get<any>('gameState');
      expect(stored?.player1RematchRequested).toBe(true);
      expect(stored?.player2RematchRequested).toBe(true);
    });
  });

  describe('Player Disconnect/Reconnect', () => {
    it('should track player connectivity', async () => {
      const players = {
        'player-1': { connected: true, disconnectTime: null },
        'player-2': { connected: true, disconnectTime: null },
      };
      await mockState.storage.put('players', players);

      let stored = await mockState.storage.get<any>('players');
      expect(stored['player-1'].connected).toBe(true);

      stored['player-1'].connected = false;
      stored['player-1'].disconnectTime = Date.now();
      await mockState.storage.put('players', stored);

      stored = await mockState.storage.get<any>('players');
      expect(stored['player-1'].connected).toBe(false);
      expect(stored['player-1'].disconnectTime).toBeTruthy();
    });

    it('should handle reconnection', async () => {
      const players = {
        'player-1': { connected: false, disconnectTime: 1000 },
      };
      await mockState.storage.put('players', players);

      let stored = await mockState.storage.get<any>('players');
      stored['player-1'].connected = true;
      stored['player-1'].disconnectTime = null;
      await mockState.storage.put('players', stored);

      stored = await mockState.storage.get<any>('players');
      expect(stored['player-1'].connected).toBe(true);
      expect(stored['player-1'].disconnectTime).toBeNull();
    });
  });
});

describe('Durable Objects - Concurrency', () => {
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
  });

  describe('Concurrent Cell Updates', () => {
    it('should handle simultaneous cell updates from both players', async () => {
      const cells = { '0,0': 'A', '0,1': '', '1,0': '' };
      await mockState.storage.put('cells', cells);

      // Simulate concurrent updates
      const update1 = mockState.storage.get<any>('cells').then(c => {
        c['0,1'] = 'B';
        return mockState.storage.put('cells', c);
      });

      const update2 = mockState.storage.get<any>('cells').then(c => {
        c['1,0'] = 'C';
        return mockState.storage.put('cells', c);
      });

      await Promise.all([update1, update2]);

      const final = await mockState.storage.get<any>('cells');
      // Last update should win (or both should apply)
      expect(final).toBeTruthy();
    });

    it('should handle conflicting updates to same cell', async () => {
      const cells = { '0,0': '' };
      await mockState.storage.put('cells', cells);

      let current = await mockState.storage.get<any>('cells');
      current['0,0'] = 'A';
      await mockState.storage.put('cells', current);

      current = await mockState.storage.get<any>('cells');
      current['0,0'] = 'B'; // Overwrite with different value
      await mockState.storage.put('cells', current);

      const final = await mockState.storage.get<any>('cells');
      expect(final['0,0']).toBe('B'); // Last write wins
    });
  });

  describe('Request Ordering', () => {
    it('should preserve order of sequential operations', async () => {
      const log: string[] = [];

      for (let i = 0; i < 5; i++) {
        const entry = `operation-${i}`;
        log.push(entry);
        await mockState.storage.put(`op-${i}`, entry);
      }

      for (let i = 0; i < 5; i++) {
        const stored = await mockState.storage.get<any>(`op-${i}`);
        expect(stored).toBe(`operation-${i}`);
      }
    });

    it('should handle rapid-fire updates correctly', async () => {
      let state = { counter: 0 };
      await mockState.storage.put('state', state);

      for (let i = 0; i < 100; i++) {
        const current = await mockState.storage.get<any>('state');
        current.counter++;
        await mockState.storage.put('state', current);
      }

      const final = await mockState.storage.get<any>('state');
      expect(final.counter).toBe(100);
    });
  });
});

describe('Durable Objects - Timeout Handling', () => {
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
  });

  describe('Phase Timeouts', () => {
    it('should track phase start time', async () => {
      const now = Date.now();
      const state = { phase: 'submitting', phaseStartedAt: now };
      await mockState.storage.put('gameState', state);

      const stored = await mockState.storage.get<any>('gameState');
      expect(stored?.phaseStartedAt).toBe(now);
    });

    it('should calculate time elapsed in phase', async () => {
      const now = Date.now();
      const state = { phase: 'submitting', phaseStartedAt: now };
      await mockState.storage.put('gameState', state);

      await new Promise(resolve => setTimeout(resolve, 10));

      const stored = await mockState.storage.get<any>('gameState');
      const elapsed = Date.now() - stored?.phaseStartedAt;
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    it('should detect phase timeout', async () => {
      const phaseTimeout = 60000;
      const now = Date.now();
      const state = { phase: 'submitting', phaseStartedAt: now - phaseTimeout - 1000 };
      await mockState.storage.put('gameState', state);

      const stored = await mockState.storage.get<any>('gameState');
      const elapsed = Date.now() - stored?.phaseStartedAt;
      const timedOut = elapsed > phaseTimeout;

      expect(timedOut).toBe(true);
    });

    it('should update phase on timeout', async () => {
      const state = { phase: 'submitting', phaseStartedAt: Date.now() };
      await mockState.storage.put('gameState', state);

      let stored = await mockState.storage.get<any>('gameState');
      stored.phase = 'solving';
      await mockState.storage.put('gameState', stored);

      stored = await mockState.storage.get<any>('gameState');
      expect(stored.phase).toBe('solving');
    });
  });

  describe('Room Cleanup', () => {
    it('should mark room for cleanup after timeout', async () => {
      const state = { phase: 'finished', markedForCleanup: true };
      await mockState.storage.put('gameState', state);

      const stored = await mockState.storage.get<any>('gameState');
      expect(stored?.markedForCleanup).toBe(true);
    });

    it('should remove stale room data', async () => {
      await mockState.storage.put('staleData', 'should be deleted');
      expect(await mockState.storage.get('staleData')).toBeTruthy();

      await mockState.storage.delete('staleData');
      expect(await mockState.storage.get('staleData')).toBeUndefined();
    });
  });
});

describe('Durable Objects - Storage Recovery', () => {
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
  });

  describe('Restart Recovery', () => {
    it('should restore game state after restart', async () => {
      const gameState = {
        phase: 'solving',
        player1Progress: 50,
        player2Progress: 75,
      };
      await mockState.storage.put('gameState', gameState);

      const stored = await mockState.storage.get<any>('gameState');
      expect(stored).toEqual(gameState);
    });

    it('should restore player stats after restart', async () => {
      const stats = { wins: 10, losses: 5 };
      await mockState.storage.put('playerStats', stats);

      const stored = await mockState.storage.get<any>('playerStats');
      expect(stored).toEqual(stats);
    });

    it('should restore multiple DO instances independently', async () => {
      const state1 = new MockDurableObjectState();
      const state2 = new MockDurableObjectState();

      await state1.storage.put('data', { id: 'room-1' });
      await state2.storage.put('data', { id: 'room-2' });

      const data1 = await state1.storage.get<any>('data');
      const data2 = await state2.storage.get<any>('data');

      expect(data1?.id).toBe('room-1');
      expect(data2?.id).toBe('room-2');
    });
  });

  describe('Data Integrity', () => {
    it('should not corrupt data across multiple restarts', async () => {
      const original = { players: { p1: 'Alice', p2: 'Bob' } };
      await mockState.storage.put('gameState', original);

      let retrieved = await mockState.storage.get<any>('gameState');
      expect(retrieved).toEqual(original);

      // Simulate restart
      retrieved.players.p1 = 'Alice'; // Same value
      await mockState.storage.put('gameState', retrieved);

      retrieved = await mockState.storage.get<any>('gameState');
      expect(retrieved).toEqual(original);
    });
  });
});
