# Crossfire

A live two-player word puzzle game built with Vite + TypeScript and Cloudflare Workers.

## Tech Stack

- **Frontend**: Vite + TypeScript (vanilla JS, no framework)
- **Backend**: Cloudflare Workers
- **Real-time**: Durable Objects + WebSockets (coming soon)
- **Deployment**: Cloudflare Pages + Workers

## Project Structure

```
crossfire/
├── frontend/           # Vite frontend application
│   ├── src/
│   │   ├── main.ts    # Main application entry
│   │   └── style.css  # Global styles
│   ├── index.html     # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── worker/            # Cloudflare Worker backend
│   ├── src/
│   │   └── index.ts   # Worker entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml  # Cloudflare configuration
└── package.json       # Root workspace configuration
```

## Setup

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AiFirstDevelopment/crossfire.git
cd crossfire
```

2. Install dependencies:
```bash
npm install
```

This will install dependencies for both the frontend and worker workspaces.

## Development

### Run Both Frontend and Worker

```bash
npm run dev
```

This runs both the frontend (port 3000) and worker (port 8787) in parallel.

### Run Frontend Only

```bash
npm run dev:frontend
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

### Run Worker Only

```bash
npm run dev:worker
```

The worker will be available at [http://localhost:8787](http://localhost:8787)

### Testing the Connection

1. Start both the frontend and worker: `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. Click the "Test API Connection" button
4. You should see a successful response from the worker

## Build

### Build Both

```bash
npm run build
```

### Build Frontend Only

```bash
npm run build:frontend
```

### Build Worker Only

```bash
npm run build:worker
```

## Deployment

### Prerequisites for Deployment

1. Install Wrangler CLI globally (if not already installed):
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

### Deploy Both

```bash
npm run deploy
```

### Deploy Frontend (Cloudflare Pages)

```bash
npm run deploy:frontend
```

First-time deployment:
1. Run the deploy command
2. Follow the prompts to create a new Pages project
3. Future deployments will automatically update the same project

### Deploy Worker

```bash
npm run deploy:worker
```

## API Endpoints

### Health Check

- **Endpoint**: `/api/health`
- **Method**: GET
- **Response**:
```json
{
  "status": "ok",
  "message": "Crossfire Worker is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Next Steps

- [ ] Implement WebSocket connection
- [ ] Add Durable Objects for game rooms
- [ ] Build game logic
- [ ] Add authentication
- [ ] Design game UI

## License

MIT
