import { GameRoom } from './GameRoom';
import { Matchmaking } from './Matchmaking';
import { PlayerStats } from './PlayerStats';

export { GameRoom, Matchmaking, PlayerStats };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
  PLAYER_STATS: DurableObjectNamespace;
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
      return matchmaking.fetch(request);
    }

    // Bot game ended notification (bot games are client-side only)
    if (url.pathname === '/api/bot-game-ended' && request.method === 'POST') {
      const id = env.MATCHMAKING.idFromName('global');
      const matchmaking = env.MATCHMAKING.get(id);
      const response = await matchmaking.fetch(new Request('https://matchmaking/bot-game-ended', { method: 'POST' }));
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
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Record win - POST /api/player/:playerId/record-win
    const recordWinMatch = url.pathname.match(/^\/api\/player\/([^/]+)\/record-win$/);
    if (recordWinMatch && request.method === 'POST') {
      const playerId = recordWinMatch[1].toLowerCase();
      const id = env.PLAYER_STATS.idFromName(playerId);
      const stats = env.PLAYER_STATS.get(id);
      const response = await stats.fetch(new Request('https://stats/record-win', { method: 'POST' }));
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};
