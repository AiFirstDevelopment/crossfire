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
  private queue: Map<WebSocket, QueuedPlayer>;
  private playerCounter: number;

  constructor(_state: DurableObjectState, _env: Env) {
    this.queue = new Map();
    this.playerCounter = 0;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    return new Response(
      JSON.stringify({ queueSize: this.queue.size }),
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

    // Send welcome
    this.sendTo(server, {
      type: 'welcome',
      playerId,
      playerName,
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

    // Try to match players
    this.tryMatch();
  }

  private handleLeaveQueue(ws: WebSocket) {
    this.queue.delete(ws);
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

    // Create a new room ID
    const roomId = `game-${crypto.randomUUID()}`;

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

  private sendTo(ws: WebSocket, message: MatchmakingServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending to player:', error);
    }
  }
}
