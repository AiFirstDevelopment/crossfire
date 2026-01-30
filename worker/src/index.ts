import { GameRoom } from './GameRoom';
import { Matchmaking } from './Matchmaking';
import { PlayerStats, ACHIEVEMENTS } from './PlayerStats';
import { Leaderboard } from './Leaderboard';

export { GameRoom, Matchmaking, PlayerStats, Leaderboard };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
  PLAYER_STATS: DurableObjectNamespace;
  LEADERBOARD: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for local development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'Crossfire Worker is running',
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // Matchmaking endpoint
    if (url.pathname === '/api/matchmaking') {
      // Use a single global matchmaking instance
      const id = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(id);

      // WebSocket upgrade requests must be passed through directly
      if (request.headers.get('Upgrade') === 'websocket') {
        return matchmaking.fetch(request);
      }

      const response = await matchmaking.fetch(request);
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Bot game ended notification (bot games are client-side only)
    if (url.pathname === '/api/bot-game-ended' && request.method === 'POST') {
      const id = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(id);
      const response = await matchmaking.fetch(new Request('https://matchmaking/bot-game-ended', { method: 'POST' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Shared link clicked notification (tracks when someone joins via ?room= URL)
    if (url.pathname === '/api/shared-link-clicked' && request.method === 'POST') {
      const id = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(id);
      const response = await matchmaking.fetch(new Request('https://matchmaking/shared-link-clicked', { method: 'POST' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Create or join a room
    if (url.pathname === '/api/room/join') {
      const roomId = (url.searchParams.get('roomId') || 'default-room').toLowerCase();

      // Get the Durable Object instance for this room
      const id = env.GAME_ROOM.idFromName(roomId);
      const room = env.GAME_ROOM.get(id);

      // Forward the request to the Durable Object
      return room.fetch(request);
    }

    // Get room info
    if (url.pathname.startsWith('/api/room/')) {
      const roomId = (url.searchParams.get('roomId') || 'default-room').toLowerCase();

      const id = env.GAME_ROOM.idFromName(roomId);
      const room = env.GAME_ROOM.get(id);

      return room.fetch(request);
    }

    // Player stats - GET /api/player/:playerId/stats
    const playerStatsMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/stats$/);
    if (playerStatsMatch && request.method === 'GET') {
      const playerId = playerStatsMatch[1].toLowerCase();
      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/stats', { method: 'GET' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Register player - POST /api/player/:playerId/register
    const registerMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/register$/);
    if (registerMatch && request.method === 'POST') {
      const playerId = registerMatch[1].toLowerCase();
      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/register', { method: 'POST' }));
      const data = await response.json() as { exists: boolean; wins: number; created?: boolean };

      // If a new player was created, notify Matchmaking to increment total players count
      if (data.created) {
        const matchmakingId = env.MATCHMAKING.idFromName('global');
        const matchmaking = env.MATCHMAKING.get(matchmakingId);
        await matchmaking.fetch(new Request('https://matchmaking/player-registered', { method: 'POST' }));
      }

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Record win - POST /api/player/:playerId/record-win
    const recordWinMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/record-win$/);
    if (recordWinMatch && request.method === 'POST') {
      const playerId = recordWinMatch[1].toLowerCase();

      // Forward body with hintsUsed and timeMs
      let body = '{}';
      try {
        body = await request.text();
      } catch {
        // No body
      }

      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/record-win', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      }));
      const data = await response.json();

      // Also update leaderboard
      const leaderboardId = env.LEADERBOARD.idFromName('global');
      const leaderboard = env.LEADERBOARD.get(leaderboardId);
      await leaderboard.fetch(new Request('https://leaderboard/record', {
        method: 'POST',
        body: JSON.stringify({ playerId }),
        headers: { 'Content-Type': 'application/json' },
      }));

      // Broadcast leaderboard update to all connected clients
      const matchmakingId = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(matchmakingId);
      await matchmaking.fetch(new Request('https://matchmaking/broadcast-leaderboard', { method: 'POST' }));

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Record loss - POST /api/player/:playerId/record-loss
    const recordLossMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/record-loss$/);
    if (recordLossMatch && request.method === 'POST') {
      const playerId = recordLossMatch[1].toLowerCase();
      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/record-loss', { method: 'POST' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Record visit - POST /api/player/:playerId/visit
    const visitMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/visit$/);
    if (visitMatch && request.method === 'POST') {
      const playerId = visitMatch[1].toLowerCase();
      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/visit', { method: 'POST' }));
      const data = await response.json() as { isReturning: boolean; visitCount: number; wins: number };

      // Notify Matchmaking if this is a returning user
      if (data.isReturning) {
        const matchmakingId = env.MATCHMAKING.idFromName('global');
        const matchmaking = env.MATCHMAKING.get(matchmakingId);
        await matchmaking.fetch(new Request('https://matchmaking/returning-user', { method: 'POST' }));
      }

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Admin: Reset active games counter - POST /api/admin/reset-active-games
    if (url.pathname === '/api/admin/reset-active-games' && request.method === 'POST') {
      const matchmakingId = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(matchmakingId);
      const response = await matchmaking.fetch(new Request('https://matchmaking/admin/reset-active-games', { method: 'POST' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Leaderboard - GET /api/leaderboard/weekly
    if (url.pathname === '/api/leaderboard/weekly' && request.method === 'GET') {
      const leaderboardId = env.LEADERBOARD.idFromName('global');
      const leaderboard = env.LEADERBOARD.get(leaderboardId);
      const playerId = url.searchParams.get('playerId') || '';
      const limit = url.searchParams.get('limit') || '10';
      const response = await leaderboard.fetch(
        new Request(`https://leaderboard/weekly?playerId=${playerId}&limit=${limit}`, { method: 'GET' })
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Player rank - GET /api/leaderboard/rank/:playerId
    const playerRankMatch = url.pathname.match(/^\/api\/leaderboard\/rank\/([^/]+)$/);
    if (playerRankMatch && request.method === 'GET') {
      const playerId = playerRankMatch[1].toLowerCase();
      const leaderboardId = env.LEADERBOARD.idFromName('global');
      const leaderboard = env.LEADERBOARD.get(leaderboardId);
      const response = await leaderboard.fetch(
        new Request(`https://leaderboard/player-rank?playerId=${playerId}`, { method: 'GET' })
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Achievements list - GET /api/achievements
    if (url.pathname === '/api/achievements' && request.method === 'GET') {
      return new Response(JSON.stringify(ACHIEVEMENTS), { headers: corsHeaders });
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};
