type MessageHandler = (message: any) => void;

export class GameClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private roomId: string;
  private playerId: string | null = null;
  private playerName: string | null = null;

  constructor(roomId: string = 'default-room') {
    this.roomId = roomId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = 8787; // Worker port
      const wsUrl = `${protocol}//${host}:${port}/api/room/join?roomId=${this.roomId}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.ws = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);

          // Handle special messages
          if (message.type === 'welcome') {
            this.playerId = message.playerId;
            this.playerName = message.playerName;
          }

          // Notify all message handlers
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  getPlayerName(): string | null {
    return this.playerName;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
