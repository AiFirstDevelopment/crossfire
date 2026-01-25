import { GameRoom } from './GameRoom';
import { Matchmaking } from './Matchmaking';

export { GameRoom, Matchmaking };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
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

    // Create or join a room
    if (url.pathname === '/api/room/join') {
      const roomId = url.searchParams.get('roomId') || 'default-room';

      // Get the Durable Object instance for this room
      const id = env.GAME_ROOM.idFromName(roomId);
      const room = env.GAME_ROOM.get(id);

      // Forward the request to the Durable Object
      return room.fetch(request);
    }

    // Get room info
    if (url.pathname.startsWith('/api/room/')) {
      const roomId = url.searchParams.get('roomId') || 'default-room';

      const id = env.GAME_ROOM.idFromName(roomId);
      const room = env.GAME_ROOM.get(id);

      return room.fetch(request);
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};
