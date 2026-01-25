import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function startBot() {
  // Ensure auth directory
  if (!fs.existsSync('./auth')) {
    fs.mkdirSync('./auth')
  }

  // Copy creds.json for demo
  if (fs.existsSync('./creds.json')) {
    fs.copyFileSync('./creds.json', './auth/creds.json')
  }

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'warn' }) // demo-clean logs
  })

  console.log('🤖 Bot started')

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ Connected to WhatsApp')
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut

      console.log(`❌ Connection closed (code ${code})`)

      if (!loggedOut) {
        console.log('🔁 Reconnecting in 5s...')
        setTimeout(startBot, 5000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages?.[0]
    if (!msg?.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      ""

    if (!text) return

    console.log('📩', text)

    const command = text.trim().toLowerCase()

    if (command === '.time' || command.startsWith('.time ')) {
      const now = new Date().toLocaleTimeString()
      await sock.sendMessage(jid, {
        text: `🕒 Current time: ${now}`
      })
      console.log('✅ Replied with time')
    }
  })
}

// IMPORTANT: this line must exist
startBot()
