require("dotenv").config();
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const {
  db,
  insertTokenMC,
  updateTokenMC,
  findTokenMC,
  insertMarketCapAlert,
  deleteMarketCapAlert,
  insertSubscription,
  findChatsByMarketCapAlert,
  findChatsByToken,
  findTokensByChat,
  upsertPinnedMessage,
  findPinnedMessagesByToken,
  deletePinnedMessage,
} = require("./db");
const {
  normalizeMint,
  isValidMint,
  formatLiveMessage,
  fetchCoinData,
  formatMarketcapMessage,
  formatOfflineMessage,
  buildPumpFunButton,
} = require("./utils");
const { startSocketService } = require("./socket");
const setupCommand = require("./commands/setup");
const notifyCommand = require("./commands/notify");
const helpCommand = require("./commands/help");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;



if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}



const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });









// Register commands
bot.onText(setupCommand.regex, (msg, match) =>
  setupCommand.handler(bot, msg, match)
);
bot.onText(notifyCommand.regex, (msg, match) =>
  notifyCommand.handler(bot, msg, match)
);
bot.onText(helpCommand.regex, (msg, match) =>
  helpCommand.handler(bot, msg, match)
);

// Answer callback query
bot.on("callback_query", (callbackQuery) =>
  notifyCommand.handleCallback(bot, callbackQuery)
);

const socket = startSocketService(bot);

process.on("SIGINT", () => {
  console.log("Shutting down bot...");
  socket.close();
  bot.stopPolling();
  db.close();
  process.exit(0);
});
