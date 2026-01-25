export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface Player {
  websocket: WebSocket;
  playerId: string;
  name: string;
}

export class GameRoom {
  private state: DurableObjectState;
  private env: Env;
  private players: Map<WebSocket, Player>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.players = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade request
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // HTTP endpoints for room info
    if (url.pathname === '/room/info') {
      return new Response(
        JSON.stringify({
          playerCount: this.players.size,
          maxPlayers: 2,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    server.accept();

    // Generate player ID
    const playerId = crypto.randomUUID();
    const playerName = `Player ${this.players.size + 1}`;

    // Check if room is full
    if (this.players.size >= 2) {
      server.send(
        JSON.stringify({
          type: 'error',
          message: 'Room is full',
        })
      );
      server.close(1008, 'Room is full');
      return new Response(null, { status: 101, webSocket: client });
    }

    // Add player to the room
    const player: Player = {
      websocket: server,
      playerId,
      name: playerName,
    };
    this.players.set(server, player);

    // Send welcome message to new player
    server.send(
      JSON.stringify({
        type: 'welcome',
        playerId,
        playerName,
        playerCount: this.players.size,
      })
    );

    // Notify other players
    this.broadcast(
      {
        type: 'player-joined',
        playerId,
        playerName,
        playerCount: this.players.size,
      },
      server
    );

    // Handle incoming messages
    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(server, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle player disconnect
    server.addEventListener('close', () => {
      this.players.delete(server);
      this.broadcast({
        type: 'player-left',
        playerId,
        playerName,
        playerCount: this.players.size,
      });
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleMessage(sender: WebSocket, message: any) {
    const player = this.players.get(sender);
    if (!player) return;

    // Echo message to all other players
    this.broadcast(
      {
        type: 'message',
        playerId: player.playerId,
        playerName: player.name,
        data: message,
      },
      sender
    );
  }

  broadcast(message: any, exclude?: WebSocket) {
    const messageStr = JSON.stringify(message);
    for (const [ws, player] of this.players) {
      if (ws !== exclude) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting to player:', error);
        }
      }
    }
  }
}
