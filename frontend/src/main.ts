import './style.css'
import { GameClient } from './websocket'

// API Test Elements
const testBtn = document.getElementById('test-btn') as HTMLButtonElement
const apiResponseEl = document.getElementById('api-response') as HTMLPreElement

// WebSocket Test Elements
const roomIdInput = document.getElementById('room-id') as HTMLInputElement
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement
const wsStatusEl = document.getElementById('ws-status') as HTMLParagraphElement
const messageInput = document.getElementById('message-input') as HTMLInputElement
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement
const messagesEl = document.getElementById('messages') as HTMLDivElement

let gameClient: GameClient | null = null

// API Test
testBtn.addEventListener('click', async () => {
  try {
    apiResponseEl.textContent = 'Testing...'

    const response = await fetch('/api/health')
    const data = await response.json()

    apiResponseEl.textContent = JSON.stringify(data, null, 2)
  } catch (error) {
    apiResponseEl.textContent = error instanceof Error ? error.message : 'Unknown error'
  }
})

// WebSocket Test
connectBtn.addEventListener('click', async () => {
  const roomId = roomIdInput.value.trim() || 'test-room'

  try {
    wsStatusEl.textContent = 'Connecting...'
    connectBtn.disabled = true

    gameClient = new GameClient(roomId)

    gameClient.onMessage((message) => {
      addMessage(message)
    })

    await gameClient.connect()

    wsStatusEl.textContent = `Connected as ${gameClient.getPlayerName()} (${gameClient.getPlayerId()?.substring(0, 8)}...)`
    disconnectBtn.disabled = false
    messageInput.disabled = false
    sendBtn.disabled = false
    roomIdInput.disabled = true
  } catch (error) {
    wsStatusEl.textContent = 'Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    connectBtn.disabled = false
  }
})

disconnectBtn.addEventListener('click', () => {
  if (gameClient) {
    gameClient.disconnect()
    gameClient = null
  }

  wsStatusEl.textContent = 'Not connected'
  connectBtn.disabled = false
  disconnectBtn.disabled = true
  messageInput.disabled = true
  sendBtn.disabled = true
  roomIdInput.disabled = false
  messagesEl.innerHTML = ''
})

sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim()
  if (message && gameClient) {
    gameClient.send({ text: message })
    addMessage({
      type: 'sent',
      playerId: gameClient.getPlayerId(),
      playerName: gameClient.getPlayerName(),
      data: { text: message }
    })
    messageInput.value = ''
  }
})

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click()
  }
})

function addMessage(message: any) {
  const messageDiv = document.createElement('div')
  messageDiv.className = `message message-${message.type}`

  let content = ''
  switch (message.type) {
    case 'welcome':
      content = `✅ Welcome! You are ${message.playerName}. ${message.playerCount} player(s) in room.`
      break
    case 'player-joined':
      content = `➕ ${message.playerName} joined the room. ${message.playerCount} player(s) now.`
      break
    case 'player-left':
      content = `➖ ${message.playerName} left the room. ${message.playerCount} player(s) remaining.`
      break
    case 'message':
      content = `💬 ${message.playerName}: ${message.data?.text || JSON.stringify(message.data)}`
      break
    case 'sent':
      content = `📤 You: ${message.data?.text || JSON.stringify(message.data)}`
      break
    case 'error':
      content = `❌ Error: ${message.message}`
      break
    default:
      content = JSON.stringify(message, null, 2)
  }

  messageDiv.textContent = content
  messagesEl.appendChild(messageDiv)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

console.log('Crossfire frontend initialized')
