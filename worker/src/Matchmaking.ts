import type { MatchmakingServerMessage } from './types';

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
}

interface QueuedPlayer {
  websocket: WebSocket;
  playerId: string;
  playerName: string;
  joinedAt: number;
}

export class Matchmaking {
  private state: DurableObjectState;
  private queue: Map<WebSocket, QueuedPlayer>;
  private connectedSockets: Set<WebSocket>;
  private playerCounter: number;
  private activeGames: number;
  private totalGamesPlayed: number;
  private totalPlayers: number;

  // Seed value for historical players before tracking began
  private static readonly INITIAL_PLAYER_COUNT = 10;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.queue = new Map();
    this.connectedSockets = new Set();
    this.playerCounter = 0;
    this.activeGames = 0;
    this.totalGamesPlayed = 0;
    this.totalPlayers = Matchmaking.INITIAL_PLAYER_COUNT;

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
      return new Response(JSON.stringify({ activeGames: this.activeGames }), {
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
      return new Response(JSON.stringify({ activeGames: this.activeGames, totalGamesPlayed: this.totalGamesPlayed }), {
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

    // Return current stats
    return new Response(
      JSON.stringify({
        queueSize: this.queue.size,
        onlineCount: this.connectedSockets.size,
        activeGames: this.activeGames,
        totalGamesPlayed: this.totalGamesPlayed,
        totalPlayers: this.totalPlayers,
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
      activeGames: this.activeGames,
      totalGamesPlayed: this.totalGamesPlayed,
      totalPlayers: this.totalPlayers,
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
      activeGames: this.activeGames,
      totalGamesPlayed: this.totalGamesPlayed,
      totalPlayers: this.totalPlayers,
    });
    for (const ws of this.connectedSockets) {
      try {
        ws.send(message);
      } catch (error) {
        // Connection may be closed
      }
    }
  }

  private sendTo(ws: WebSocket, message: MatchmakingServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending to player:', error);
    }
  }
}
