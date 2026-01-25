import './style.css'

const messageEl = document.getElementById('message') as HTMLParagraphElement
const testBtn = document.getElementById('test-btn') as HTMLButtonElement
const responseEl = document.getElementById('response') as HTMLPreElement

testBtn.addEventListener('click', async () => {
  try {
    messageEl.textContent = 'Testing API connection...'
    responseEl.textContent = ''

    const response = await fetch('/api/health')
    const data = await response.json()

    messageEl.textContent = 'API connection successful!'
    responseEl.textContent = JSON.stringify(data, null, 2)
  } catch (error) {
    messageEl.textContent = 'API connection failed'
    responseEl.textContent = error instanceof Error ? error.message : 'Unknown error'
  }
})

console.log('Crossfire frontend initialized')
