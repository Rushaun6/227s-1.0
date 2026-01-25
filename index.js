import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

async function startBot() {
  // Baileys expects auth in a folder
  if (!fs.existsSync('./auth')) {
    fs.mkdirSync('./auth')
  }

  // Put creds.json into auth folder
  if (fs.existsSync('./creds.json')) {
    fs.copyFileSync('./creds.json', './auth/creds.json')
  }

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (text === '.time') {
      const now = new Date().toLocaleTimeString()
      await sock.sendMessage(msg.key.remoteJid, {
        text: `🕒 Current time: ${now}`
      })
    }
  })
}

startBot()
