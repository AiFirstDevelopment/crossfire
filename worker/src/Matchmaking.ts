import type { MatchmakingServerMessage } from './types';

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
  LEADERBOARD: DurableObjectNamespace;
}

interface QueuedPlayer {
  websocket: WebSocket;
  playerId: string;
  playerName: string;
  joinedAt: number;
}

export class Matchmaking {
  private state: DurableObjectState;
  private env: Env;
  private queue: Map<WebSocket, QueuedPlayer>;
  private connectedSockets: Set<WebSocket>;
  private playerCounter: number;
  private activeGames: number;
  private totalGamesPlayed: number;
  private totalPlayers: number;
  private returningUsers: number;
  private sharedLinkClicks: number;

  // Seed values for historical activity before tracking began
  private static readonly INITIAL_PLAYER_COUNT = 6;
  private static readonly INITIAL_GAMES_COUNT = 12;
  private static readonly MIN_ACTIVE_GAMES_DISPLAY = 6;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.queue = new Map();
    this.connectedSockets = new Set();
    this.playerCounter = 0;
    this.activeGames = 0;
    this.totalGamesPlayed = Matchmaking.INITIAL_GAMES_COUNT;
    this.totalPlayers = Matchmaking.INITIAL_PLAYER_COUNT;
    this.returningUsers = 0;
    this.sharedLinkClicks = 0;

    // Load persisted counts
    this.state.blockConcurrencyWhile(async () => {
      const storedActive = await this.state.storage.get<number>('activeGames');
      if (storedActive !== undefined) {
        this.activeGames = storedActive;
      }
      const storedTotal = await this.state.storage.get<number>('totalGamesPlayed');
      if (storedTotal !== undefined) {
        this.totalGamesPlayed = storedTotal;
      }
      const storedPlayers = await this.state.storage.get<number>('totalPlayers');
      if (storedPlayers !== undefined) {
        this.totalPlayers = storedPlayers;
      }
      const storedReturning = await this.state.storage.get<number>('returningUsers');
      if (storedReturning !== undefined) {
        this.returningUsers = storedReturning;
      }
      const storedSharedLinkClicks = await this.state.storage.get<number>('sharedLinkClicks');
      if (storedSharedLinkClicks !== undefined) {
        this.sharedLinkClicks = storedSharedLinkClicks;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle game-started notification from GameRoom (for rematches)
    if (url.pathname === '/game-started' && request.method === 'POST') {
      this.activeGames++;
      await this.state.storage.put('activeGames', this.activeGames);
      this.broadcastStats();
      return new Response(JSON.stringify({ activePlayers: this.getDisplayActivePlayers() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle game-ended notification from GameRoom
    if (url.pathname === '/game-ended' && request.method === 'POST') {
      this.activeGames = Math.max(0, this.activeGames - 1);
      this.totalGamesPlayed++;
      await this.state.storage.put('activeGames', this.activeGames);
      await this.state.storage.put('totalGamesPlayed', this.totalGamesPlayed);
      this.broadcastStats();
      return new Response(JSON.stringify({ activePlayers: this.getDisplayActivePlayers(), totalGamesPlayed: this.totalGamesPlayed }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle bot game ended notification from frontend (bot games are client-side only)
    if (url.pathname === '/bot-game-ended' && request.method === 'POST') {
      this.totalGamesPlayed++;
      await this.state.storage.put('totalGamesPlayed', this.totalGamesPlayed);
      this.broadcastStats();
      return new Response(JSON.stringify({ totalGamesPlayed: this.totalGamesPlayed }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle new player registered notification
    if (url.pathname === '/player-registered' && request.method === 'POST') {
      this.totalPlayers++;
      await this.state.storage.put('totalPlayers', this.totalPlayers);
      this.broadcastStats();
      return new Response(JSON.stringify({ totalPlayers: this.totalPlayers }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle returning user notification
    if (url.pathname === '/returning-user' && request.method === 'POST') {
      this.returningUsers++;
      await this.state.storage.put('returningUsers', this.returningUsers);
      this.broadcastStats();
      return new Response(JSON.stringify({ returningUsers: this.returningUsers }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle shared link click notification (tracks when someone joins via ?room= URL)
    if (url.pathname === '/shared-link-clicked' && request.method === 'POST') {
      this.sharedLinkClicks++;
      await this.state.storage.put('sharedLinkClicks', this.sharedLinkClicks);
      return new Response(JSON.stringify({ sharedLinkClicks: this.sharedLinkClicks }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Admin endpoint to reset active games counter (for fixing stuck counters)
    if (url.pathname === '/admin/reset-active-games' && request.method === 'POST') {
      this.activeGames = 0;
      await this.state.storage.put('activeGames', this.activeGames);
      this.broadcastStats();
      return new Response(JSON.stringify({ activePlayers: this.getDisplayActivePlayers(), message: 'Active games counter reset to 0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Broadcast leaderboard update to all connected clients
    if (url.pathname === '/broadcast-leaderboard' && request.method === 'POST') {
      await this.broadcastLeaderboard();
      return new Response(JSON.stringify({ success: true, clientCount: this.connectedSockets.size }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return current stats
    return new Response(
      JSON.stringify({
        queueSize: this.queue.size,
        onlineCount: this.connectedSockets.size,
        activePlayers: this.getDisplayActivePlayers(),
        totalGamesPlayed: this.totalGamesPlayed,
        totalPlayers: this.totalPlayers,
        returningUsers: this.returningUsers,
        sharedLinkClicks: this.sharedLinkClicks,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async handleWebSocket(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    const playerId = crypto.randomUUID();
    this.playerCounter++;
    const playerName = `Player ${this.playerCounter}`;

    // Track this connection
    this.connectedSockets.add(server);

    // Always read latest stats from storage to ensure persistence works
    const storedTotal = await this.state.storage.get<number>('totalGamesPlayed');
    if (storedTotal !== undefined && storedTotal > this.totalGamesPlayed) {
      this.totalGamesPlayed = storedTotal;
    }
    const storedActive = await this.state.storage.get<number>('activeGames');
    if (storedActive !== undefined) {
      this.activeGames = storedActive;
    }

    // Send welcome with current stats
    this.sendTo(server, {
      type: 'welcome',
      playerId,
      playerName,
      queueSize: this.queue.size,
      onlineCount: this.connectedSockets.size,
      activePlayers: this.getDisplayActivePlayers(),
      totalGamesPlayed: this.totalGamesPlayed,
      totalPlayers: this.totalPlayers,
      returningUsers: this.returningUsers,
    });

    // Handle messages
    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(server, playerId, playerName, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle disconnect
    server.addEventListener('close', () => {
      this.queue.delete(server);
      this.connectedSockets.delete(server);
      // Always broadcast since online count changes
      this.broadcastStats();
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(ws: WebSocket, playerId: string, playerName: string, message: { type: string }) {
    switch (message.type) {
      case 'join-queue':
        this.handleJoinQueue(ws, playerId, playerName);
        break;
      case 'leave-queue':
        this.handleLeaveQueue(ws);
        break;
    }
  }

  private handleJoinQueue(ws: WebSocket, playerId: string, playerName: string) {
    // Already in queue
    if (this.queue.has(ws)) {
      return;
    }

    // Add to queue
    const player: QueuedPlayer = {
      websocket: ws,
      playerId,
      playerName,
      joinedAt: Date.now(),
    };
    this.queue.set(ws, player);

    // Notify player of queue position
    this.sendTo(ws, {
      type: 'queue-joined',
      position: this.queue.size,
    });

    // Broadcast updated queue size to all connected players
    this.broadcastStats();

    // Try to match players
    this.tryMatch();
  }

  private handleLeaveQueue(ws: WebSocket) {
    this.queue.delete(ws);
    this.broadcastStats();
  }

  private tryMatch() {
    if (this.queue.size < 2) return;

    // Get first two players in queue
    const entries = Array.from(this.queue.entries());
    const [ws1, player1] = entries[0];
    const [ws2, player2] = entries[1];

    // Remove from queue
    this.queue.delete(ws1);
    this.queue.delete(ws2);

    // Broadcast updated queue size
    this.broadcastStats();

    // Create a new room ID
    const roomId = `game-${crypto.randomUUID()}`;

    // Track active game
    this.activeGames++;
    this.state.storage.put('activeGames', this.activeGames);

    // Notify both players
    this.sendTo(ws1, {
      type: 'match-found',
      roomId,
      opponent: { id: player2.playerId, name: player2.playerName },
    });

    this.sendTo(ws2, {
      type: 'match-found',
      roomId,
      opponent: { id: player1.playerId, name: player1.playerName },
    });

    // Close matchmaking connections (players will connect to game room)
    setTimeout(() => {
      try {
        ws1.close(1000, 'Match found');
        ws2.close(1000, 'Match found');
      } catch (e) {
        // Ignore close errors
      }
    }, 100);
  }

  private broadcastStats() {
    const message = JSON.stringify({
      type: 'stats-update',
      queueSize: this.queue.size,
      onlineCount: this.connectedSockets.size,
      activePlayers: this.getDisplayActivePlayers(),
      totalGamesPlayed: this.totalGamesPlayed,
      totalPlayers: this.totalPlayers,
      returningUsers: this.returningUsers,
    });
    for (const ws of this.connectedSockets) {
      try {
        ws.send(message);
      } catch (error) {
        // Connection may be closed
      }
    }
  }

  private async broadcastLeaderboard() {
    try {
      // Fetch leaderboard data
      const leaderboardId = this.env.LEADERBOARD.idFromName('global');
      const leaderboard = this.env.LEADERBOARD.get(leaderboardId);
      const response = await leaderboard.fetch(
        new Request('https://leaderboard/weekly?limit=10', { method: 'GET' })
      );
      const data = await response.json() as { leaderboard: Array<{ rank: number; playerId: string; wins: number }> };

      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'leaderboard-update',
        leaderboard: data.leaderboard,
      });
      for (const ws of this.connectedSockets) {
        try {
          ws.send(message);
        } catch (error) {
          // Connection may be closed
        }
      }
    } catch (error) {
      console.error('Error broadcasting leaderboard:', error);
    }
  }

  // Returns active players count with baseline for display (social proof)
  private getDisplayActivePlayers(): number {
    return 6 + this.connectedSockets.size;
  }

  private sendTo(ws: WebSocket, message: MatchmakingServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending to player:', error);
    }
  }
}
