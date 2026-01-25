import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import P from "pino"
import fs from "fs"

async function startBot() {
  const authDir = "./auth"

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir)
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    printQRInTerminal: false, // IMPORTANT
  })

  // 🔐 PAIRING CODE FLOW
  if (!state.creds.registered) {
    console.log("📲 Requesting pairing code...")
    const code = await sock.requestPairingCode("18764526429") // <-- YOUR NUMBER
    console.log("🔢 Pairing Code:", code)
  }

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (text?.trim().toLowerCase() === ".time") {
      await sock.sendMessage(jid, {
        text: `🕒 Time: ${new Date().toLocaleTimeString()}`
      })
    }
  })

  console.log("🤖 Bot is running")
}

startBot()
