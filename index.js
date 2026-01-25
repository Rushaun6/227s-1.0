import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

// small helper
const wait = (ms) => new Promise((res) => setTimeout(res, ms))

/**
 * Create a single connection instance and resolve when it closes.
 * If it closed because of logout (loggedOut), we'll signal caller to exit.
 */
async function connectOnce() {
  // Ensure auth folder exists
  if (!fs.existsSync('./auth')) fs.mkdirSync('./auth')

  // Copy creds.json if present (only for your test/demo)
  if (fs.existsSync('./creds.json')) {
    fs.copyFileSync('./creds.json', './auth/creds.json')
  }

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    logger: P({ level: 'info' }), // show INFO logs
    auth: state
  })

  // ensure creds are saved on update
  sock.ev.on('creds.update', saveCreds)

  console.log('🤖 Baileys socket created — waiting for connection...')

  // message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg || !msg.message || msg.key.fromMe) return

      const jid = msg.key.remoteJid

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ""

      console.log('📩 Received:', text)

      if (!text) return

      const command = text.trim().toLowerCase()

      // exact .time command
      if (command === '.time' || command.startsWith('.time ')) {
        const now = new Date().toLocaleTimeString()
        await sock.sendMessage(jid, { text: `🕒 Current time: ${now}` })
        console.log('✅ Replied with time to', jid)
      }
    } catch (err) {
      console.error('handler error', err)
    }
  })

  // Return a promise that resolves when the connection update says 'close'
  return new Promise((resolve, reject) => {
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update

      if (connection === 'open') {
        console.log('✅ connected to WA')
      }

      if (connection === 'close') {
        // determine if we should reconnect
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut
        console.warn('❌ connection closed — code:', statusCode, 'loggedOut:', loggedOut)

        // cleanly close socket if available
        try {
          sock.ws?.close()
        } catch (e) {}

        // resolve with object saying whether to reconnect
        resolve({ shouldReconnect: !loggedOut, loggedOut })
      }
    })

    // also capture fatal errors
    sock.ev.on('connection.error', (err) => {
      console.error('connection.error', err)
    })
  })
}

// main loop: keep trying to connect, with backoff on repeated failures
async function mainLoop() {
  console.log('🔁 Starting main loop (will attempt reconnects automatically)')

  let attempt = 0

  while (true) {
    try {
      console.log('➡️ Attempting to create a connection (attempt', attempt + 1, ')')
      const res = await connectOnce()

      // connectOnce resolved -> connection closed
      if (!res) {
        console.warn('⚠️ connectOnce returned no result, retrying shortly...')
        attempt++
        const backoff = Math.min(600000, 1000 * 2 ** attempt) // max 10min
        console.log(`⏳ Backing off ${backoff} ms...`)
        await wait(backoff)
        continue
      }

      if (res.loggedOut) {
        console.error('⛔ The session was logged out. You must re-authenticate (new QR / new session). Exiting process.')
        process.exit(0)
      }

      // closed but not logged out -> reconnect
      attempt = 0
      console.log('🔁 Connection closed but not logged out. Reconnecting in 5s...')
      await wait(5000)
    } catch (err) {
      attempt++
      const backoff = Math.min(600000, 1000 * 2 ** attempt)
      console.error('🔥 Fatal error in connection loop:', err)
      console.log(`⏳ Backing off ${backoff} ms before retrying...`)
      await wait(backoff)
    }
  }
}

// handle uncaughts so the process doesn't die
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err)
})

mainLoop()
