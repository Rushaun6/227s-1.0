import fs from "fs"
import TelegramBot from "node-telegram-bot-api"

// ⚠️ Your bot token (rotate later)
const token = "8212205147:AAETVoiQza7rhwqCQIV53aeIeGj7QKv_xDw"

const bot = new TelegramBot(token, { polling: true })

const DB_FILE = "./database.json"
const START_WALLET = 500
const START_BANK = 0

// ---------- DATABASE HELPERS ----------

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function getUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      wallet: START_WALLET,
      bank: START_BANK,
      career: null,
      house: null,
      inventory: [],
      protections: [],
      cooldowns: {},
      punishments: {},
      stats: {}
    }
    saveDB(db)
  }
  return db.users[userId]
}

// ---------- COMMAND HANDLER ----------

bot.on("message", (msg) => {
  if (!msg.text) return

  const chatId = msg.chat.id
  const userId = msg.from.id.toString()
  const text = msg.text.trim().toLowerCase()

  const db = loadDB()
  const user = getUser(db, userId)

  // BALANCE COMMAND
  if (text === ".balance") {
    bot.sendMessage(
      chatId,
      `💼 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`
    )
  }
})

console.log("🤖 Economy bot Phase 1 started")
