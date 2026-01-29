import TelegramBot from "node-telegram-bot-api"
import fetch from "node-fetch"

// ====== TELEGRAM ======
const BOT_TOKEN = "8212205147:AAETVoiQza7rhwqCQIV53aeIeGj7QKv_xDw"
const bot = new TelegramBot(BOT_TOKEN, { polling: true })

// ====== SUPABASE ======
const SUPABASE_URL = "https://ktxijelzutqgmegvuayz.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0eGlqZWx6dXRxZ21lZ3Z1YXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzAyMjksImV4cCI6MjA4NTIwNjIyOX0.zbsMK9bukjn20LEt3VDd7TydZoxyBhRwyJeYQ84D0Wk"

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
}

// ====== DATA ======

const CAREERS = {
  cleaner: [50, 100],
  delivery: [80, 150],
  fastfood: [70, 140],
  clerk: [120, 200],
  mechanic: [150, 260],
  freelancer: [100, 350],
  developer: [200, 400],
  influencer: [0, 600],
  trader: [100, 800],
  syndicate: [300, 700]
}

const CRIMES = {
  pickpocket: [50, 120, 0.2],
  shoplift: [40, 150, 0.25],
  scam: [100, 300, 0.3],
  car: [200, 500, 0.35],
  burglary: [250, 600, 0.4],
  fraud: [400, 900, 0.45],
  cyber: [300, 800, 0.35],
  drugs: [500, 1200, 0.5],
  robbery: [800, 2000, 0.6],
  heist: [1500, 4000, 0.7]
}

// ====== SUPABASE HELPERS ======

async function getUser(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?user_id=eq.${userId}`,
    { headers: HEADERS }
  )
  const data = await res.json()
  return data[0] || null
}

async function createUser(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      user_id: userId,
      wallet: 500,
      bank: 0,
      career: null
    })
  })
  const data = await res.json()
  return data[0]
}

async function updateUser(userId, patch) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(patch)
  })
}

// ====== BOT ======

bot.on("message", async (msg) => {
  if (!msg.text) return

  const chatId = msg.chat.id
  const userId = msg.from.id.toString()
  const text = msg.text.trim().toLowerCase()

  let user = await getUser(userId)
  if (!user) user = await createUser(userId)

  // ===== MENU =====
  if (text === ".menu") {
    return bot.sendMessage(
      chatId,
      `📜 *MAIN MENU*

💰 Economy
• .balance
• .careers
• .career <name>
• .work

🕵️ Crime
• .crimes
• .crime <type>

ℹ️ Info
• .menu`,
      { parse_mode: "Markdown" }
    )
  }

  // ===== BALANCE =====
  if (text === ".balance") {
    return bot.sendMessage(
      chatId,
      `💼 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`
    )
  }

  // ===== CAREERS =====
  if (text === ".careers") {
    return bot.sendMessage(
      chatId,
      Object.keys(CAREERS)
        .map((c) => `• ${c}`)
        .join("\n")
    )
  }

  if (text.startsWith(".career ")) {
    const c = text.split(" ")[1]
    if (!CAREERS[c]) return bot.sendMessage(chatId, "❌ Invalid career.")
    await updateUser(userId, { career: c })
    return bot.sendMessage(chatId, `✅ Career set to ${c}`)
  }

  // ===== WORK =====
  if (text === ".work") {
    if (!user.career)
      return bot.sendMessage(chatId, "❌ Choose a career first.")

    const [min, max] = CAREERS[user.career]
    const pay = Math.floor(Math.random() * (max - min + 1)) + min
    await updateUser(userId, { wallet: user.wallet + pay })
    return bot.sendMessage(chatId, `💼 You earned $${pay}`)
  }

  // ===== CRIMES =====
  if (text === ".crimes") {
    return bot.sendMessage(
      chatId,
      Object.keys(CRIMES)
        .map((c) => `• ${c}`)
        .join("\n")
    )
  }

  if (text.startsWith(".crime ")) {
    const c = text.split(" ")[1]
    if (!CRIMES[c]) return bot.sendMessage(chatId, "❌ Invalid crime.")

    const [min, max, fail] = CRIMES[c]
    if (Math.random() < fail) {
      const fine = Math.min(200, user.wallet)
      await updateUser(userId, { wallet: user.wallet - fine })
      return bot.sendMessage(chatId, `🚨 Caught! You lost $${fine}`)
    }

    const loot = Math.floor(Math.random() * (max - min + 1)) + min
    await updateUser(userId, { wallet: user.wallet + loot })
    return bot.sendMessage(chatId, `🕵️ Crime successful! +$${loot}`)
  }
})

console.log("🤖 Telegram economy bot fully online (Supabase)")
