export interface Env {
  LEADERBOARD: DurableObjectNamespace;
}

interface WinRecord {
  playerId: string;
  timestamp: number;
}

// Rolling 7-day window in milliseconds
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class Leaderboard {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  // Get all wins from the last 7 days, grouped by player
  private async getRecentWins(): Promise<Map<string, number>> {
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
      const body = await request.json() as { playerId: string };
      const { playerId } = body;

      if (!playerId) {
        return new Response(JSON.stringify({ error: 'playerId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add new win record
      const wins = await this.state.storage.get<WinRecord[]>('wins') || [];
      wins.push({ playerId, timestamp: Date.now() });
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
