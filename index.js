import fs from "fs"
import TelegramBot from "node-telegram-bot-api"

const token = "8212205147:AAETVoiQza7rhwqCQIV53aeIeGj7QKv_xDw"
const bot = new TelegramBot(token, { polling: true })

const DB_FILE = "./database.json"
const START_WALLET = 500
const START_BANK = 0

const CAREERS = {
  cleaner: { name: "Street Cleaner", min: 50, max: 100, cd: 30 * 60 },
  delivery: { name: "Delivery Driver", min: 80, max: 150, cd: 30 * 60 },
  fastfood: { name: "Fast Food Worker", min: 70, max: 140, cd: 30 * 60 },
  clerk: { name: "Office Clerk", min: 120, max: 200, cd: 45 * 60 },
  mechanic: { name: "Mechanic", min: 150, max: 260, cd: 45 * 60 },
  freelancer: { name: "Freelancer", min: 100, max: 350, cd: 60 * 60 },
  dev: { name: "Software Developer", min: 200, max: 400, cd: 60 * 60 },
  influencer: { name: "Influencer", min: 0, max: 600, cd: 60 * 60 },
  trader: { name: "Stock Trader", min: 100, max: 800, cd: 2 * 60 * 60 },
  syndicate: { name: "Crime Syndicate Member", min: 300, max: 700, cd: 2 * 60 * 60 }
}

// ---------- DB HELPERS ----------

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

function now() {
  return Math.floor(Date.now() / 1000)
}

// ---------- COMMANDS ----------

bot.on("message", (msg) => {
  if (!msg.text) return

  const chatId = msg.chat.id
  const userId = msg.from.id.toString()
  const text = msg.text.trim().toLowerCase()

  const db = loadDB()
  const user = getUser(db, userId)

  // BALANCE
  if (text === ".balance") {
    return bot.sendMessage(
      chatId,
      `💼 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`
    )
  }

  // CAREER LIST
  if (text === ".careers") {
    const list = Object.entries(CAREERS)
      .map(([key, c]) => `• ${c.name} → .career ${key}`)
      .join("\n")

    return bot.sendMessage(chatId, `👔 Careers:\n${list}`)
  }

  // CHOOSE CAREER
  if (text.startsWith(".career ")) {
    const choice = text.split(" ")[1]
    if (!CAREERS[choice]) {
      return bot.sendMessage(chatId, "❌ Invalid career.")
    }

    user.career = choice
    saveDB(db)

    return bot.sendMessage(
      chatId,
      `✅ Career set to **${CAREERS[choice].name}**`
    )
  }

  // WORK
  if (text === ".work") {
    if (!user.career) {
      return bot.sendMessage(chatId, "❌ Choose a career first: .careers")
    }

    const career = CAREERS[user.career]
    const lastWork = user.cooldowns.work || 0
    const diff = now() - lastWork

    if (diff < career.cd) {
      const mins = Math.ceil((career.cd - diff) / 60)
      return bot.sendMessage(chatId, `⏳ Try again in ${mins} min.`)
    }

    const earned =
      Math.floor(Math.random() * (career.max - career.min + 1)) + career.min

    user.wallet += earned
    user.cooldowns.work = now()
    saveDB(db)

    return bot.sendMessage(
      chatId,
      `💼 ${career.name}\n💰 You earned $${earned}`
    )
  }
})

console.log("🤖 Economy bot Phase 2 started")
