import { beforeEach, afterEach, vi } from 'vitest';

// Polyfill CloseEvent for Node.js environment
if (typeof (globalThis as any).CloseEvent === 'undefined') {
  (globalThis as any).CloseEvent = class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;

    constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
      super(type);
      this.code = init?.code ?? 1000;
      this.reason = init?.reason ?? '';
      this.wasClean = init?.wasClean ?? true;
    }
  };
}

// Mock Durable Objects Storage
export class MockStorage implements DurableObjectStorage {
  private data: Map<string, any> = new Map();

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T;
  }

  async put(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async list<T = any>(options?: any): Promise<Map<string, T>> {
    return new Map(this.data);
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    keys.forEach(k => this.data.delete(k));
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  // Alarm methods (no-op in tests)
  setAlarm(_scheduledTime: number | Date): void {
    // No-op in tests
  }

  getAlarm(): Promise<number | null> {
    return Promise.resolve(null);
  }

  deleteAlarm(): void {
    // No-op in tests
  }
}

// Mock Durable Object State
export class MockDurableObjectState implements DurableObjectState {
  readonly id = {
    toString: () => 'mock-id',
    equals: () => true,
  };
  readonly storage = new MockStorage();

  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  waitUntil(promise: Promise<any>): void {
    // No-op in tests
  }

  abort(): void {
    // No-op in tests
  }
}

// Mock WebSocket - constants for readyState
const WS_OPEN = 1;
const WS_CLOSED = 3;

// Mock WebSocket
export class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState = WS_OPEN;

  private messages: any[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();

  send(data: string | ArrayBufferLike): void {
    this.messages.push(JSON.parse(data as string));
  }

  close(code?: number, reason?: string): void {
    this.readyState = WS_CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
    this.dispatchEvent('close', new CloseEvent('close', { code: code || 1000, reason }));
  }

  accept(): void {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
    this.dispatchEvent('open', new Event('open'));
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private dispatchEvent(event: string, eventObj: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(eventObj));
    }
    const onHandler = (this as any)[`on${event}`];
    if (onHandler && typeof onHandler === 'function') {
      onHandler.call(this, eventObj);
    }
  }

  getMessages(): any[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
  }
}

// Setup/teardown
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// Utility functions
export function createMockEnv(): any {
  return {
    GAME_ROOM: {
      idFromName: (name: string) => ({ name }),
      get: (id: any) => ({
        fetch: vi.fn(),
      }),
    },
    MATCHMAKING: {
      idFromName: (name: string) => ({ name }),
      get: (id: any) => ({
        fetch: vi.fn(),
      }),
    },
    PLAYER_STATS: {
      idFromName: (name: string) => ({ name }),
      get: (id: any) => ({
        fetch: vi.fn(),
      }),
    },
  };
}

export function createMockGameState(): any {
  return {
    phase: 'waiting',
    players: {},
    playerWords: {},
    grids: {},
    progress: {},
    phaseStartedAt: Date.now(),
  };
}

// Mock WebSocketPair for Cloudflare Workers
export class MockWebSocketPair {
  client: MockWebSocket;
  server: MockWebSocket;

  constructor() {
    this.client = new MockWebSocket();
    this.server = new MockWebSocket();
  }

  [Symbol.iterator]() {
    return [this.client, this.server][Symbol.iterator]();
  }

  [Symbol.at](index: number): MockWebSocket | undefined {
    return index === 0 ? this.client : index === 1 ? this.server : undefined;
  }
}

// Expose WebSocketPair globally for tests
if (typeof globalThis !== 'undefined' && !('WebSocketPair' in globalThis)) {
  (globalThis as any).WebSocketPair = MockWebSocketPair;
}

// Mock Response to support WebSocket upgrade (status 101)
// Node.js Response doesn't support status 101, but Cloudflare Workers does
const OriginalResponse = globalThis.Response;

(globalThis as any).Response = class MockResponse extends OriginalResponse {
  declare webSocket: WebSocket | null;

  constructor(body?: BodyInit | null, init?: ResponseInit & { webSocket?: any }) {
    // For status 101 (WebSocket upgrade), use 200 as a workaround since Node.js doesn't support 101
    const status = init?.status === 101 ? 200 : init?.status;
    super(body, { ...init, status });
    if (init?.webSocket) {
      (this as any).webSocket = init.webSocket;
    }
    // Store the original intended status
    Object.defineProperty(this, '_wsStatus', { value: init?.status });
  }
};

