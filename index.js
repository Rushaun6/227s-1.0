import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

async function startBot() {
  // Ensure auth folder exists
  if (!fs.existsSync('./auth')) {
    fs.mkdirSync('./auth')
  }

  // Copy creds.json if present
  if (fs.existsSync('./creds.json')) {
    fs.copyFileSync('./creds.json', './auth/creds.json')
  }

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    logger: P({ level: 'info' }), // IMPORTANT
    auth: state
  })

  console.log("🤖 Bot started, waiting for messages...")

  // VERY IMPORTANT
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      ""

    console.log("📩 Received:", text)

    if (!text) return

    const command = text.trim().toLowerCase()

    if (command === ".time") {
      const now = new Date().toLocaleTimeString()
      await sock.sendMessage(jid, {
        text: `🕒 Current time: ${now}`
      })
    }
  })
}

startBot()
