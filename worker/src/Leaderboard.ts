export interface Env {
  LEADERBOARD: DurableObjectNamespace;
}

interface WinRecord {
  playerId: string;
  timestamp: number;
  isMultiplayer?: boolean; // true for multiplayer, false for bot games (defaults to true for legacy records)
}

// Old format for migration
interface OldLeaderboardEntry {
  playerId: string;
  wins: number;
  updatedAt: number;
}

interface OldWeeklyData {
  weekId: string;
  entries: Record<string, OldLeaderboardEntry>;
}

// Rolling 7-day window in milliseconds
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class Leaderboard {
  private state: DurableObjectState;
  private migrationPromise: Promise<void> | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  // Migrate old weekly bucket data to new rolling window format
  private async migrateIfNeeded(): Promise<void> {
    // Only run migration once per instance
    if (this.migrationPromise) {
      return this.migrationPromise;
    }

    this.migrationPromise = this.doMigration();
    return this.migrationPromise;
  }

  private async doMigration(): Promise<void> {
    const migrated = await this.state.storage.get<boolean>('migrated_v2');
    if (migrated) {
      return;
    }

    // Get all keys that start with 'week:'
    const allKeys = await this.state.storage.list<OldWeeklyData>();
    const weekKeys = Array.from(allKeys.entries()).filter(([key]) => key.startsWith('week:'));

    if (weekKeys.length === 0) {
      await this.state.storage.put('migrated_v2', true);
      return;
    }

    // Convert old entries to new format
    const newWins: WinRecord[] = [];
    const now = Date.now();

    for (const [, weekData] of weekKeys) {
      if (!weekData?.entries) continue;

      for (const entry of Object.values(weekData.entries)) {
        // Create win records for each win, spread over the past 7 days
        // Use updatedAt if available, otherwise spread evenly
        const baseTime = entry.updatedAt || (now - SEVEN_DAYS_MS / 2);
        for (let i = 0; i < entry.wins; i++) {
          // Spread wins out over the time window to avoid clustering
          const offset = (i / Math.max(entry.wins - 1, 1)) * (SEVEN_DAYS_MS * 0.8);
          const timestamp = Math.max(baseTime - offset, now - SEVEN_DAYS_MS + 1000);
          newWins.push({ playerId: entry.playerId, timestamp });
        }
      }
    }

    // Store migrated data
    if (newWins.length > 0) {
      const existingWins = await this.state.storage.get<WinRecord[]>('wins') || [];
      await this.state.storage.put('wins', [...existingWins, ...newWins]);
    }

    // Mark migration as complete
    await this.state.storage.put('migrated_v2', true);
  }

  // Get all wins from the last 7 days, grouped by player
  private async getRecentWins(): Promise<Map<string, number>> {
    await this.migrateIfNeeded();
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const wins = await this.state.storage.get<WinRecord[]>('wins') || [];

    // Filter to last 7 days and count by player
    const playerWins = new Map<string, number>();
    for (const win of wins) {
      if (win.timestamp >= cutoff) {
        playerWins.set(win.playerId, (playerWins.get(win.playerId) || 0) + 1);
      }
    }
    return playerWins;
  }

  // Clean up old wins (older than 7 days)
  private async cleanupOldWins(): Promise<void> {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const wins = await this.state.storage.get<WinRecord[]>('wins') || [];
    const recentWins = wins.filter(w => w.timestamp >= cutoff);

    if (recentWins.length !== wins.length) {
      await this.state.storage.put('wins', recentWins);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // POST /record - Record a win for a player
    if (request.method === 'POST' && url.pathname === '/record') {
      const body = await request.json() as { playerId: string; isMultiplayer?: boolean };
      const { playerId, isMultiplayer = true } = body;

      if (!playerId) {
        return new Response(JSON.stringify({ error: 'playerId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Ensure migration is complete before recording
      await this.migrateIfNeeded();

      // Add new win record
      const wins = await this.state.storage.get<WinRecord[]>('wins') || [];
      wins.push({ playerId, timestamp: Date.now(), isMultiplayer });
      await this.state.storage.put('wins', wins);

      // Cleanup old wins periodically (every 100 wins)
      if (wins.length % 100 === 0) {
        await this.cleanupOldWins();
      }

      // Get current standings
      const playerWins = await this.getRecentWins();
      const sorted = Array.from(playerWins.entries()).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === playerId) + 1;

      return new Response(JSON.stringify({
        wins: playerWins.get(playerId) || 0,
        rank,
        totalPlayers: sorted.length,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /weekly - Get leaderboard (past 7 days)
    if (request.method === 'GET' && url.pathname === '/weekly') {
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const playerId = url.searchParams.get('playerId');

      const playerWins = await this.getRecentWins();
      const sorted = Array.from(playerWins.entries()).sort((a, b) => b[1] - a[1]);

      const topEntries = sorted.slice(0, limit).map(([id, wins], idx) => ({
        rank: idx + 1,
        playerId: id,
        wins,
      }));

      // Find player's rank if requested
      let playerRank: number | null = null;
      let playerWinsCount: number | null = null;
      if (playerId) {
        const idx = sorted.findIndex(([id]) => id === playerId);
        if (idx !== -1) {
          playerRank = idx + 1;
          playerWinsCount = sorted[idx][1];
        }
      }

      return new Response(JSON.stringify({
        leaderboard: topEntries,
        totalPlayers: sorted.length,
        playerRank,
        playerWins: playerWinsCount,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /games-over-time - Get games grouped by hour for the past 7 days
    if (request.method === 'GET' && url.pathname === '/games-over-time') {
      await this.migrateIfNeeded();
      const wins = await this.state.storage.get<WinRecord[]>('wins') || [];
      const cutoff = Date.now() - SEVEN_DAYS_MS;

      // Group wins by hour, tracking multiplayer vs bot separately
      const hourlyGames = new Map<number, { multiplayer: number; bot: number }>();
      for (const win of wins) {
        if (win.timestamp >= cutoff) {
          // Round down to the nearest hour
          const hourTimestamp = Math.floor(win.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
          const existing = hourlyGames.get(hourTimestamp) || { multiplayer: 0, bot: 0 };
          // Legacy records without isMultiplayer field are treated as multiplayer
          if (win.isMultiplayer !== false) {
            existing.multiplayer++;
          } else {
            existing.bot++;
          }
          hourlyGames.set(hourTimestamp, existing);
        }
      }

      // Convert to sorted array
      const data = Array.from(hourlyGames.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([timestamp, counts]) => ({
          timestamp,
          games: counts.multiplayer + counts.bot,
          multiplayer: counts.multiplayer,
          bot: counts.bot,
        }));

      return new Response(JSON.stringify({ data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /player-rank - Get a specific player's rank
    if (request.method === 'GET' && url.pathname === '/player-rank') {
      const playerId = url.searchParams.get('playerId');
      if (!playerId) {
        return new Response(JSON.stringify({ error: 'playerId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const playerWins = await this.getRecentWins();
      const sorted = Array.from(playerWins.entries()).sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([id]) => id === playerId);

      return new Response(JSON.stringify({
        rank: idx !== -1 ? idx + 1 : null,
        wins: playerWins.get(playerId) || 0,
        totalPlayers: sorted.length,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
