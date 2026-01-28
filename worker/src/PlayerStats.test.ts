import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerStats } from './PlayerStats';
import { MockDurableObjectState, createMockEnv } from './test-setup';

describe('PlayerStats', () => {
  let playerStats: PlayerStats;
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    playerStats = new PlayerStats(mockState, createMockEnv());
  });

  describe('GET /stats', () => {
    it('should return exists: false for unregistered player', async () => {
      const request = new Request('https://player/stats', { method: 'GET' });
      const response = await playerStats.fetch(request);
      const data = await response.json() as { exists: boolean; wins: number };

      expect(response.status).toBe(200);
      expect(data.exists).toBe(false);
      expect(data.wins).toBe(0);
    });

    it('should return player stats after registration', async () => {
      // Register first
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));

      // Then get stats
      const response = await playerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
      const data = await response.json() as { exists: boolean; wins: number };

      expect(data.exists).toBe(true);
      expect(data.wins).toBe(0);
    });

    it('should return correct win count after recording wins', async () => {
      // Register and record 3 wins
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));

      const response = await playerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
      const data = await response.json() as { exists: boolean; wins: number };

      expect(data.wins).toBe(3);
    });
  });

  describe('POST /register', () => {
    it('should register a new player with zero wins', async () => {
      const response = await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
      const data = await response.json() as { exists: boolean; wins: number; created?: boolean };

      expect(response.status).toBe(200);
      expect(data.exists).toBe(true);
      expect(data.wins).toBe(0);
      expect(data.created).toBe(true);
    });

    it('should return existing player data on duplicate registration', async () => {
      // Register twice
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
      // Record a win
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      // Try to register again
      const response = await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
      const data = await response.json() as { exists: boolean; wins: number; created?: boolean };

      expect(data.exists).toBe(true);
      expect(data.wins).toBe(1);
      expect(data.created).toBeUndefined(); // Not created, already existed
    });

    it('should persist registration data in storage', async () => {
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));

      // Verify storage was updated
      const stored = await mockState.storage.get<{ wins: number; createdAt: number }>('data');
      expect(stored).toBeDefined();
      expect(stored!.wins).toBe(0);
      expect(stored!.createdAt).toBeGreaterThan(0);
    });
  });

  describe('POST /record-win', () => {
    it('should increment win count for registered player', async () => {
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));

      const response = await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      const data = await response.json() as { wins: number };

      expect(response.status).toBe(200);
      expect(data.wins).toBe(1);
    });

    it('should create player if recording win for unregistered player', async () => {
      // Record win without registering first
      const response = await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      const data = await response.json() as { wins: number };

      expect(data.wins).toBe(1);

      // Verify player now exists with 1 win
      const statsResponse = await playerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
      const statsData = await statsResponse.json() as { exists: boolean; wins: number };
      expect(statsData.exists).toBe(true);
      expect(statsData.wins).toBe(1);
    });

    it('should track lastWinAt timestamp', async () => {
      const beforeWin = Date.now();
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      const afterWin = Date.now();

      const stored = await mockState.storage.get<{ wins: number; lastWinAt?: number }>('data');
      expect(stored!.lastWinAt).toBeDefined();
      expect(stored!.lastWinAt).toBeGreaterThanOrEqual(beforeWin);
      expect(stored!.lastWinAt).toBeLessThanOrEqual(afterWin);
    });

    it('should accumulate multiple wins correctly', async () => {
      for (let i = 1; i <= 10; i++) {
        const response = await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
        const data = await response.json() as { wins: number };
        expect(data.wins).toBe(i);
      }
    });
  });

  describe('Unknown endpoints', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await playerStats.fetch(new Request('https://player/unknown', { method: 'GET' }));
      expect(response.status).toBe(404);
    });

    it('should return 404 for wrong HTTP method on /stats', async () => {
      const response = await playerStats.fetch(new Request('https://player/stats', { method: 'POST' }));
      expect(response.status).toBe(404);
    });

    it('should return 404 for wrong HTTP method on /register', async () => {
      const response = await playerStats.fetch(new Request('https://player/register', { method: 'GET' }));
      expect(response.status).toBe(404);
    });
  });

  describe('Data persistence', () => {
    it('should persist data across multiple fetch calls', async () => {
      // Register
      await playerStats.fetch(new Request('https://player/register', { method: 'POST' }));
      // Record wins
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));
      await playerStats.fetch(new Request('https://player/record-win', { method: 'POST' }));

      // Create a new PlayerStats instance with same storage (simulating DO restart)
      const newPlayerStats = new PlayerStats(mockState, createMockEnv());

      // Stats should still be there
      const response = await newPlayerStats.fetch(new Request('https://player/stats', { method: 'GET' }));
      const data = await response.json() as { exists: boolean; wins: number };

      expect(data.exists).toBe(true);
      expect(data.wins).toBe(2);
    });
  });
});
