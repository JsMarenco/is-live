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
const { io } = require("socket.io-client");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SOCKET_URL = process.env.SOCKET_URL;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY;


if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}



const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const normalizeMint = (raw) => raw.replace(/\s+/g, "").trim();
const isValidMint = (mint) => /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(mint);

const formatStreamLabel = (stream) => {
  const label = stream.name || stream.symbol || "Unnamed token";
  return `${label}`;
};

const formatLiveMessage = (stream) => {
  const title = stream.livestream_title
    ? `\n\n🎬 ${stream.livestream_title}`
    : "";
  const viewers =
    typeof stream.viewers === "number"
      ? `\n👀 Viewers: ${stream.viewers} \n💰Market Cap: ${stream.market_cap_usd}\n👤Holders: ${stream.holders}`
      : "";
  return `🟢 ${formatStreamLabel(stream)} is LIVE!${title}${viewers}🚀`;
};

const fetchCoinData = async (mint) => {
  try {
    const response = await fetch(`https://data.pumpmod.live/coin/${mint}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch coin data:", error);
    return null;
  }
};

const formatMarketcapMessage = (stream) => {
  return `📈 ${formatStreamLabel(
    stream
  )} market cap updated: $${stream.market_cap_usd.toLocaleString()}`;
};

const formatOfflineMessage = (stream) =>
  `🔴 ${formatStreamLabel(stream)} went offline.`;

const subscribeToToken = async (chatId, tokenAddress) => {
  const normalized = normalizeMint(tokenAddress);

  if (!isValidMint(normalized)) {
    return {
      ok: false,
      message: "Please provide a valid Solana token address.",
    };
  }

  const result = insertSubscription.run(String(chatId), normalized);
  if (result.changes === 0) {
    return { ok: true, message: "You are already subscribed to this token." };
  }
  const coinData = await fetchCoinData(tokenAddress);
  return {
    ok: true,
    message: `Subscribed! You will be notified when ${coinData?.name || normalized
      } goes live or offline.`,
  };
};

const listSubscriptionsForChat = (chatId) => {
  const rows = findTokensByChat.all(String(chatId));
  if (!rows.length) {
    return "You have no subscriptions yet. Use /setup <tokenAddress> to add one.";
  }

  const lines = rows.map(
    (row, index) => `${index + 1}. ${row.name || row.token_address}`
  );
  return `Your subscriptions:\n${lines.join("\n")}`;
};

const buildPumpFunButton = (mint) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: "Open on Pumpfun", url: `https://pump.fun/coin/${mint}` }],
    ],
  },
});

const sendMessageBatch = async (chatRows, text, options) => {
  const sendPromises = chatRows.map((row) =>
    bot.sendMessage(row.chat_id, text, options).catch((error) => {
      console.warn(
        `Failed to send message to chat ${row.chat_id}`,
        error.message
      );
    })
  );
  await Promise.all(sendPromises);
};

const notifyChatsStreamLive = async (chats, stream) => {
  const options = buildPumpFunButton(stream.mint);
  for (const row of chats) {
    try {
      const sentMessage = await bot.sendMessage(
        row.chat_id,
        formatLiveMessage(stream),
        options
      );
      await bot.pinChatMessage(row.chat_id, sentMessage.message_id, {
        disable_notification: true,
      });
      upsertPinnedMessage.run(row.chat_id, stream.mint, sentMessage.message_id);
    } catch (error) {
      console.warn(
        `Failed to notify or pin chat ${row.chat_id}`,
        error.message
      );
    }
  }
};

const unpinChatsForToken = async (tokenAddress) => {
  const pinnedRows = findPinnedMessagesByToken.all(tokenAddress);
  if (!pinnedRows.length) {
    return;
  }

  const operations = pinnedRows.map(async (row) => {
    try {
      await bot.unpinChatMessage(row.chat_id, row.message_id);
    } catch (error) {
      console.warn(
        `Failed to unpin message ${row.message_id} in chat ${row.chat_id}`,
        error.message
      );
    } finally {
      deletePinnedMessage.run(row.chat_id, tokenAddress);
    }
  });

  await Promise.all(operations);
};

const showNotifyMarketCapMenu = (chatId, tokenAddress) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Alert me when market cap increases by 10%",
            callback_data: `mc_alert|threshold|10|up`,
          },
        ],
        [
          {
            text: "Alert me when market cap decreases by 10%",
            callback_data: `mc_alert|threshold|10|down`,
          },
        ],
        [
          {
            text: "Delete this alert",
            callback_data: `mc_alert|delete|0|none`,
          },
        ],
      ],
    },
  };

  bot.sendMessage(
    chatId,
    `Set market cap alerts for token: ${tokenAddress}`,
    options
  );
};

bot.onText(/^\/setup(?:@[\w_]+)?\s+(\S+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const tokenAddress = match?.[1] || "";
  const response = await subscribeToToken(chatId, tokenAddress);
  bot.sendMessage(chatId, response.message);
});

bot.onText(/^\/notify(?:@[\w_]+)?\s+(\S+)/i, (msg) => {
  const chatId = msg.chat.id;
  const address = msg.text.split(" ")[1];

  if (!address) {
    bot.sendMessage(chatId, "Please provide a token address.");

    return;
  }

  bot.sendMessage(chatId, showNotifyMarketCapMenu(chatId, address));
});

bot.onText(/^\/help(?:@[\w_]+)?$/, (msg) => {
  const helpText =
    "$ITSLIVE Livestream Bot commands:\n" +
    "/setup <tokenAddress> - Subscribe to a token\n";
  // '/list - Show your current subscriptions';
  bot.sendMessage(msg.chat.id, helpText);
});

// Answere back query
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith("mc_alert")) {
    const [, type, value, direction] = data.split("|");
    const messageId = msg.message_id;
    const tokenAddress = msg.text.match(/token:\s+(\S+)/)[1];

    const result = insertMarketCapAlert.run(
      String(chatId),
      tokenAddress,
      messageId,
      type,
      type === "threshold" ? parseInt(value, 10) : 0,
      type === "amount" ? parseInt(value, 10) : 0,
      direction
    );

    if (result.changes === 0) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: `You already have a market cap alert set for ${tokenAddress}.`,
      });
    }

    bot.answerCallbackQuery(callbackQuery.id, {
      text: `Market cap alert set for ${tokenAddress}!`,
    });
  }
});

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnectionDelayMax: 10000,
  auth: SOCKET_API_KEY ? { apiKey: SOCKET_API_KEY } : undefined,
});

socket.on("connect", () => {
  console.log("Connected to websocket", socket.id);
});

socket.on("connect_error", (error) => {
  console.warn("Websocket connection failed", error.message);
});

socket.on("disconnect", (reason) => {
  console.warn("Disconnected from websocket", reason);
});

socket.on("nowLive", async (stream) => {
  if (!stream?.mint) {
    return;
  }
  const chats = findChatsByToken.all(stream.mint);
  if (!chats.length) {
    return;
  }
  await notifyChatsStreamLive(chats, stream);
});

socket.on("market_cap_update", async (stream) => {
  const newMC = stream.market_cap_usd;
  if (!stream?.mint) {
    return;
  }
  const oldMCrow = findTokenMC.get(stream.mint);
  const oldMC = oldMCrow ? oldMCrow.market_cap_usd : 0;
  insertTokenMC.run(stream.mint, stream.market_cap_usd);
  updateTokenMC.run(stream.market_cap_usd, stream.mint);
  const isUp = newMC > oldMC;
  const mcChange = Math.abs(newMC - oldMC);
  const percentChange = oldMC === 0 ? 100 : (mcChange / oldMC) * 100;

  const chats = findChatsByMarketCapAlert.all(stream.mint);
  if (!chats.length) {
    return;
  }
  const options = buildPumpFunButton(stream.mint);
  for (const row of chats) {
    try {
      const { chat_id, message_id, type, threshold, amount, direction } = row;
      let shouldNotify = false;
      if (type === "threshold") {
        if (isUp && direction === "up" && percentChange >= threshold) {
          shouldNotify = true;
        } else if (
          !isUp &&
          direction === "down" &&
          percentChange >= threshold
        ) {
          shouldNotify = true;
        }
      } else if (type === "amount") {
        if (mcChange >= amount) {
          if (direction === "up" && isUp) {
            shouldNotify = true;
          } else if (direction === "down" && !isUp) {
            shouldNotify = true;
          }
        }
      }
      if (shouldNotify) {
        await bot.editMessageText(
          formatMarketcapMessage(stream, percentChange, isUp, amount),
          {
            chat_id: pinned.chat_id,
            message_id: pinned.message_id,
            ...options,
          }
        );
      }
    } catch (error) {
      console.warn(
        `Failed to update message in chat ${row.chat_id}`,
        error.message
      );
    }
  }
});

socket.on("streamOffline", async (stream) => {
  if (!stream?.mint) {
    return;
  }
  const chats = findChatsByToken.all(stream.mint);
  if (!chats.length) {
    return;
  }
  await unpinChatsForToken(stream.mint);
  await sendMessageBatch(chats, formatOfflineMessage(stream));
});

process.on("SIGINT", () => {
  console.log("Shutting down bot...");
  socket.close();
  bot.stopPolling();
  db.close();
  process.exit(0);
});
