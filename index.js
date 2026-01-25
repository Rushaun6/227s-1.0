import TelegramBot from "node-telegram-bot-api"

const token = "8212205147:AAETVoiQza7rhwqCQIV53aeIeGj7QKv_xDw"

const bot = new TelegramBot(token, { polling: true })

bot.on("message", (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  if (text === ".time") {
    bot.sendMessage(
      chatId,
      `🕒 Time: ${new Date().toLocaleTimeString()}`
    )
  }
})

console.log("🤖 Telegram bot started")
