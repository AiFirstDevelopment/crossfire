export interface Env {
  PLAYER_STATS: DurableObjectNamespace;
}

interface PlayerData {
  wins: number;
  createdAt: number;
  lastWinAt?: number;
  lastVisitAt?: number;
  visitCount?: number;
}

export class PlayerStats {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET /stats - Get player stats
    if (request.method === 'GET' && url.pathname === '/stats') {
      const data = await this.state.storage.get<PlayerData>('data');

      if (!data) {
        return new Response(JSON.stringify({ exists: false, wins: 0 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ exists: true, wins: data.wins }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /register - Register a new player
    if (request.method === 'POST' && url.pathname === '/register') {
      const existing = await this.state.storage.get<PlayerData>('data');
      if (existing) {
        return new Response(JSON.stringify({ exists: true, wins: existing.wins }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data: PlayerData = {
        wins: 0,
        createdAt: Date.now(),
      };
      await this.state.storage.put('data', data);

      return new Response(JSON.stringify({ exists: true, wins: 0, created: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /record-win - Record a win
    if (request.method === 'POST' && url.pathname === '/record-win') {
      let data = await this.state.storage.get<PlayerData>('data');

      if (!data) {
        data = {
          wins: 0,
          createdAt: Date.now(),
        };
      }

      data.wins += 1;
      data.lastWinAt = Date.now();

      await this.state.storage.put('data', data);

      return new Response(JSON.stringify({ wins: data.wins }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /visit - Record a visit (for returning user tracking)
    if (request.method === 'POST' && url.pathname === '/visit') {
      let data = await this.state.storage.get<PlayerData>('data');
      const isReturning = data !== undefined && (data.visitCount ?? 0) > 0;

      if (!data) {
        data = {
          wins: 0,
          createdAt: Date.now(),
          visitCount: 1,
          lastVisitAt: Date.now(),
        };
      } else {
        data.visitCount = (data.visitCount ?? 0) + 1;
        data.lastVisitAt = Date.now();
      }

      await this.state.storage.put('data', data);

      return new Response(JSON.stringify({
        isReturning,
        visitCount: data.visitCount,
        wins: data.wins,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
