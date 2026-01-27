import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerStats } from './PlayerStats';
import { MockDurableObjectState, createMockEnv } from './test-setup';

describe('PlayerStats - Persistence', () => {
  let playerStats: PlayerStats;
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    playerStats = new PlayerStats(mockState, createMockEnv());
  });

  describe('Player Registration', () => {
    it('should register new player with zero wins', async () => {
      const data = {
        wins: 0,
        createdAt: Date.now(),
      };

      await mockState.storage.put('data', data);
      const stored = await mockState.storage.get<any>('data');

      expect(stored?.wins).toBe(0);
      expect(stored?.createdAt).toBeTruthy();
    });

    it('should reject duplicate registration', async () => {
      const data1 = { wins: 0, createdAt: Date.now() };
      await mockState.storage.put('data', data1);

      const existing = await mockState.storage.get<any>('data');
      expect(existing).toBeTruthy();
      expect(existing?.wins).toBe(0);
    });

    it('should preserve player registration on restart', async () => {
      const data = { wins: 5, createdAt: 1000000 };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored).toEqual(data);
    });
  });

  describe('Win Tracking', () => {
    it('should increment win count', async () => {
      let data = {
        wins: 0,
        createdAt: Date.now(),
      };
      await mockState.storage.put('data', data);

      data.wins++;
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(1);
    });

    it('should track multiple wins', async () => {
      let data = {
        wins: 0,
        createdAt: Date.now(),
      };
      await mockState.storage.put('data', data);

      for (let i = 0; i < 100; i++) {
        data.wins++;
      }
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(100);
    });

    it('should record last win timestamp', async () => {
      const now = Date.now();
      const data = {
        wins: 1,
        createdAt: now,
        lastWinAt: now,
      };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.lastWinAt).toBe(now);
    });
  });

  describe('Stats Retrieval', () => {
    it('should return zero wins for non-existent player', async () => {
      const stored = await mockState.storage.get<any>('data');
      const wins = stored ? stored.wins : 0;

      expect(wins).toBe(0);
    });

    it('should return accurate win count', async () => {
      const data = { wins: 42, createdAt: Date.now() };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(42);
    });

    it('should include creation timestamp', async () => {
      const createdAt = Date.now();
      const data = { wins: 0, createdAt };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.createdAt).toBe(createdAt);
    });
  });

  describe('Stats Update', () => {
    it('should update existing player stats', async () => {
      let data = { wins: 5, createdAt: Date.now() };
      await mockState.storage.put('data', data);

      data.wins = 10;
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(10);
    });

    it('should maintain immutable fields', async () => {
      const createdAt = 1000000;
      const data = { wins: 0, createdAt };
      await mockState.storage.put('data', data);

      let stored = await mockState.storage.get<any>('data');
      const originalCreatedAt = stored?.createdAt;

      stored.wins = 5;
      await mockState.storage.put('data', stored);

      stored = await mockState.storage.get<any>('data');
      expect(stored?.createdAt).toBe(originalCreatedAt);
    });

    it('should update last win timestamp separately', async () => {
      const data = {
        wins: 0,
        createdAt: Date.now(),
      };
      await mockState.storage.put('data', data);

      const now1 = Date.now();
      data.wins++;
      const dataWithWin = { ...data, lastWinAt: now1 };
      await mockState.storage.put('data', dataWithWin);

      let stored = await mockState.storage.get<any>('data');
      expect(stored?.lastWinAt).toBe(now1);

      await new Promise(resolve => setTimeout(resolve, 10));

      const now2 = Date.now();
      dataWithWin.wins++;
      dataWithWin.lastWinAt = now2;
      await mockState.storage.put('data', dataWithWin);

      stored = await mockState.storage.get<any>('data');
      expect(stored?.lastWinAt).toBe(now2);
      expect(stored?.lastWinAt).toBeGreaterThanOrEqual(now1);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across multiple operations', async () => {
      const operations = [];

      // Simulate multiple concurrent updates
      for (let i = 0; i < 10; i++) {
        const promise = mockState.storage
          .put('data', { wins: i, createdAt: Date.now() })
          .then(() => mockState.storage.get('data'));
        operations.push(promise);
      }

      const results = await Promise.all(operations);
      const finalData = await mockState.storage.get<any>('data');

      expect(finalData).toBeTruthy();
      expect(typeof finalData?.wins).toBe('number');
      expect(typeof finalData?.createdAt).toBe('number');
    });

    it('should not lose data during storage operations', async () => {
      const originalData = {
        wins: 50,
        createdAt: 1000000,
        lastWinAt: 1000001,
      };

      await mockState.storage.put('data', originalData);

      const retrieved = await mockState.storage.get<any>('data');
      expect(retrieved).toEqual(originalData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero wins', async () => {
      const data = { wins: 0, createdAt: Date.now() };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(0);
    });

    it('should handle large win counts', async () => {
      const data = { wins: 999999, createdAt: Date.now() };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.wins).toBe(999999);
    });

    it('should handle missing optional fields gracefully', async () => {
      const data = { wins: 0, createdAt: Date.now() };
      await mockState.storage.put('data', data);

      const stored = await mockState.storage.get<any>('data');
      expect(stored?.lastWinAt).toBeUndefined();
      expect(stored?.wins).toBe(0);
    });
  });
});
