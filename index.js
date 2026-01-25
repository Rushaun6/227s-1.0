import fs from "fs"
import TelegramBot from "node-telegram-bot-api"

const token = "8212205147:AAETVoiQza7rhwqCQIV53aeIeGj7QKv_xDw"
const bot = new TelegramBot(token, { polling: true })

const DB_FILE = "./database.json"

const CAREERS = {
  cleaner: { name: "Street Cleaner", min: 50, max: 100, cd: 1800 },
  delivery: { name: "Delivery Driver", min: 80, max: 150, cd: 1800 },
  fastfood: { name: "Fast Food Worker", min: 70, max: 140, cd: 1800 },
  clerk: { name: "Office Clerk", min: 120, max: 200, cd: 2700 },
  mechanic: { name: "Mechanic", min: 150, max: 260, cd: 2700 },
  freelancer: { name: "Freelancer", min: 100, max: 350, cd: 3600 },
  dev: { name: "Software Developer", min: 200, max: 400, cd: 3600 },
  influencer: { name: "Influencer", min: 0, max: 600, cd: 3600 },
  trader: { name: "Stock Trader", min: 100, max: 800, cd: 7200 },
  syndicate: { name: "Crime Syndicate Member", min: 300, max: 700, cd: 7200 }
}

const CRIMES = {
  pickpocket: { min: 50, max: 120, fail: 0.2 },
  shoplift: { min: 40, max: 150, fail: 0.25 },
  scam: { min: 100, max: 300, fail: 0.3 },
  car: { min: 200, max: 500, fail: 0.35 },
  burglary: { min: 250, max: 600, fail: 0.4 },
  fraud: { min: 400, max: 900, fail: 0.45 },
  cyber: { min: 300, max: 800, fail: 0.35 },
  drugs: { min: 500, max: 1200, fail: 0.5 },
  robbery: { min: 800, max: 2000, fail: 0.6 },
  heist: { min: 1500, max: 4000, fail: 0.7 }
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_FILE))
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function now() {
  return Math.floor(Date.now() / 1000)
}

bot.on("message", (msg) => {
  if (!msg.text) return

  const chatId = msg.chat.id
  const userId = msg.from.id.toString()
  const text = msg.text.toLowerCase().trim()

  const db = loadDB()
  if (!db.users[userId]) {
    db.users[userId] = {
      wallet: 500,
      bank: 0,
      career: null,
      cooldowns: {}
    }
  }

  const user = db.users[userId]

  // BALANCE
  if (text === ".balance") {
    return bot.sendMessage(chatId, `💼 $${user.wallet} | 🏦 $${user.bank}`)
  }

  // CAREERS
  if (text === ".careers") {
    return bot.sendMessage(
      chatId,
      Object.entries(CAREERS)
        .map(([k, v]) => `${v.name} → .career ${k}`)
        .join("\n")
    )
  }

  if (text.startsWith(".career ")) {
    const c = text.split(" ")[1]
    if (!CAREERS[c]) return bot.sendMessage(chatId, "❌ Invalid career.")
    user.career = c
    saveDB(db)
    return bot.sendMessage(chatId, `✅ Career set to ${CAREERS[c].name}`)
  }

  // WORK
  if (text === ".work") {
    if (!user.career) return bot.sendMessage(chatId, "❌ Choose a career first.")
    const job = CAREERS[user.career]
    if (now() - (user.cooldowns.work || 0) < job.cd)
      return bot.sendMessage(chatId, "⏳ On cooldown.")

    const pay = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
    user.wallet += pay
    user.cooldowns.work = now()
    saveDB(db)
    return bot.sendMessage(chatId, `💼 Earned $${pay}`)
  }

  // CRIME LIST
  if (text === ".crimes") {
    return bot.sendMessage(
      chatId,
      Object.keys(CRIMES)
        .map((c) => `• ${c} → .crime ${c}`)
        .join("\n")
    )
  }

  // CRIME
  if (text.startsWith(".crime ")) {
    const crime = text.split(" ")[1]
    if (!CRIMES[crime]) return bot.sendMessage(chatId, "❌ Invalid crime.")

    if (now() - (user.cooldowns.crime || 0) < 1800)
      return bot.sendMessage(chatId, "🚔 You're laying low. Try later.")

    const roll = Math.random()
    if (roll < CRIMES[crime].fail) {
      const fine = Math.min(user.wallet, 200)
      user.wallet -= fine
      user.cooldowns.crime = now()
      saveDB(db)
      return bot.sendMessage(chatId, `🚨 Caught! You paid $${fine}`)
    }

    const loot =
      Math.floor(Math.random() * (CRIMES[crime].max - CRIMES[crime].min + 1)) +
      CRIMES[crime].min

    user.wallet += loot
    user.cooldowns.crime = now()
    saveDB(db)

    return bot.sendMessage(chatId, `🕵️ Crime successful! You got $${loot}`)
  }
})

console.log("🤖 Bot running with Crime System")
