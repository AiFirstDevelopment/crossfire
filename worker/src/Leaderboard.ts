export interface Env {
  LEADERBOARD: DurableObjectNamespace;
}

interface LeaderboardEntry {
  playerId: string;
  wins: number;
  updatedAt: number;
}

interface WeeklyData {
  weekId: string; // Format: YYYY-WW
  entries: Record<string, LeaderboardEntry>;
}

function getWeekId(date?: Date): string {
  const d = date || new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

export class Leaderboard {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const currentWeekId = getWeekId();

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

      // Get or create weekly data
      let weekData = await this.state.storage.get<WeeklyData>(`week:${currentWeekId}`);
      if (!weekData) {
        weekData = { weekId: currentWeekId, entries: {} };
      }

      // Update player's entry
      const existing = weekData.entries[playerId];
      weekData.entries[playerId] = {
        playerId,
        wins: (existing?.wins ?? 0) + 1,
        updatedAt: Date.now(),
      };

      await this.state.storage.put(`week:${currentWeekId}`, weekData);

      // Return player's current rank
      const sortedEntries = Object.values(weekData.entries).sort((a, b) => b.wins - a.wins);
      const rank = sortedEntries.findIndex(e => e.playerId === playerId) + 1;

      return new Response(JSON.stringify({
        wins: weekData.entries[playerId].wins,
        rank,
        totalPlayers: sortedEntries.length,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /weekly - Get weekly leaderboard
    if (request.method === 'GET' && url.pathname === '/weekly') {
      const weekId = url.searchParams.get('week') || currentWeekId;
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const playerId = url.searchParams.get('playerId');

      const weekData = await this.state.storage.get<WeeklyData>(`week:${weekId}`);

      if (!weekData) {
        return new Response(JSON.stringify({
          weekId,
          leaderboard: [],
          totalPlayers: 0,
          playerRank: null,
          playerWins: null,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sortedEntries = Object.values(weekData.entries).sort((a, b) => b.wins - a.wins);
      const topEntries = sortedEntries.slice(0, limit).map((entry, idx) => ({
        rank: idx + 1,
        playerId: entry.playerId,
        wins: entry.wins,
      }));

      // Find player's rank if requested
      let playerRank: number | null = null;
      let playerWins: number | null = null;
      if (playerId) {
        const idx = sortedEntries.findIndex(e => e.playerId === playerId);
        if (idx !== -1) {
          playerRank = idx + 1;
          playerWins = sortedEntries[idx].wins;
        }
      }

      return new Response(JSON.stringify({
        weekId,
        leaderboard: topEntries,
        totalPlayers: sortedEntries.length,
        playerRank,
        playerWins,
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

      const weekData = await this.state.storage.get<WeeklyData>(`week:${currentWeekId}`);

      if (!weekData || !weekData.entries[playerId]) {
        return new Response(JSON.stringify({
          weekId: currentWeekId,
          rank: null,
          wins: 0,
          totalPlayers: weekData ? Object.keys(weekData.entries).length : 0,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sortedEntries = Object.values(weekData.entries).sort((a, b) => b.wins - a.wins);
      const rank = sortedEntries.findIndex(e => e.playerId === playerId) + 1;

      return new Response(JSON.stringify({
        weekId: currentWeekId,
        rank,
        wins: weekData.entries[playerId].wins,
        totalPlayers: sortedEntries.length,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
