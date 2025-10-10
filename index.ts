import TelegramBot, { type Message } from "node-telegram-bot-api";
import fs from "fs-extra";
import path from "path";
import axios from "axios";

const token = process.env.TELEGRAM_TOKEN_BOT as string;
const bot = new TelegramBot(token, { polling: true });

const TOKENS_DIR = path.join(process.cwd(), "tokens");
const TOKENS_FILE = path.join(TOKENS_DIR, "db.json");

interface TokenChat {
  id: number;
  username?: string;
  first_name?: string;
}

interface StoredToken {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  chats: TokenChat[];
  isCurrentlyLive: boolean;
  hasNotified: boolean;
}

interface TokensDB {
  [address: string]: StoredToken;
}

interface BotCommand {
  name: string;
  description: string;
  example: string;
}

const commands: BotCommand[] = [
  {
    name: "/notify",
    description: "Subscribe to be notified when a Pump.fun token goes live.",
    example: "/notify <token_address>pump",
  },
  {
    name: "/menu",
    description: "Show all available commands.",
    example: "/menu",
  },
];

/**
 * Logs token registration or user notification events.
 * @param {Object} props - The input props.
 * @param {boolean} props.isNew - True if a new token was added.
 * @param {TokenChat} props.user - The user related to the event.
 * @param {StoredToken} props.token - The token object.
 * @param {string} props.message - The message to log.
 */
const logTokenActivity = ({ isNew, token }: {
  isNew: boolean,
  token: StoredToken
}) => {
  const time = `[${new Date().toLocaleString()}]`
  const tokenAddress = token.tokenAddress.length > 40 ? token.tokenAddress.slice(0, 40) + '...' : token.tokenAddress
  const chatCount = token.chats.length
  const action = isNew ? 'New token added' : 'User subscribed for notifications'
  console.log(`${time} ${action}: ${tokenAddress} | ${chatCount} user(s)`)
}

/**
 * Retrieves token information from Pump.fun API by its address.
 * @param tokenAddress - The address of the token.
 * @returns The token data object or null if unavailable.
 */
const fetchTokenDetails = async (
  tokenAddress: string
): Promise<any | null> => {
  const url = `https://frontend-api-v3.pump.fun/coins/${tokenAddress}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch token details:", error.message);
    return null;
  }
};

/**
 * Loads the list of saved tokens from local storage.
 * @returns The stored token data object.
 */
const loadSavedTokens = async (): Promise<TokensDB> => {
  await fs.ensureDir(TOKENS_DIR);
  const exists = await fs.pathExists(TOKENS_FILE);
  return exists ? await fs.readJson(TOKENS_FILE) : {};
};

/**
 * Persists the given token data to local storage.
 * @param data - The token data object to be saved.
 */
const saveTokensToFile = async (data: TokensDB): Promise<void> => {
  await fs.writeJson(TOKENS_FILE, data, { spaces: 2 });
};

/**
 * Registers a user's interest in a specific token and stores it locally.
 * @param msg - The Telegram message object containing the user's input.
 */
const handleSubscriptionCommand = async (msg: Message): Promise<void> => {
  if (!msg.text?.includes("/notify")) return;

  const chatId = msg.chat.id;
  const args = msg.text.split("/notify");
  const tokenAddress = args[1]?.trim();

  if (!tokenAddress || !tokenAddress.endsWith("pump")) {
    await bot.sendMessage(
      chatId,
      "Invalid token address format. Please send a valid Pump token address."
    );
    return;
  }

  const storedTokens = await loadSavedTokens();
  const existing = storedTokens[tokenAddress];
  const tokenInfo = await fetchTokenDetails(tokenAddress);

  if (!tokenInfo) {
    await bot.sendMessage(
      chatId,
      "Could not fetch token information. Please try again later."
    );
    return;
  }

  const isCurrentlyLive = tokenInfo.is_currently_live;

  if (!existing) {
    storedTokens[tokenAddress] = {
      tokenAddress,
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      chats: [msg.chat as TokenChat],
      isCurrentlyLive,
      hasNotified: false,
    };
  } else {
    const alreadySubscribed = existing.chats.some((c) => c.id === chatId);
    if (!alreadySubscribed) {
      existing.chats.push(msg.chat as TokenChat);
    }
  }

  if (!storedTokens[tokenAddress]) return

  await saveTokensToFile(storedTokens);

  logTokenActivity({ isNew: existing ? true : false, token: storedTokens[tokenAddress] })

  await bot.sendMessage(
    chatId,
    `Hello ${msg.chat.first_name || "user"}, you will be notified when ${tokenInfo.name} (${tokenInfo.symbol}) goes live.`
  );
};

/**
 * Sends notifications to subscribed users when their tokens go live.
 */
/**
 * Sends notifications to subscribed users when their tokens go live.
 * Handles undefined values safely to prevent runtime errors.
 */
const dispatchLiveTokenNotifications = async (): Promise<void> => {
  const storedTokens = await loadSavedTokens();
  const tokenAddresses = Object.keys(storedTokens);

  for (const address of tokenAddresses) {
    const tokenData = storedTokens[address];
    if (!tokenData) continue;

    const tokenInfo = await fetchTokenDetails(address);
    if (!tokenInfo) continue;

    const nowLive: boolean = tokenInfo.is_currently_live ?? false;

    if (tokenData && nowLive === true && tokenData.hasNotified !== true) {
      for (const chat of tokenData.chats ?? []) {
        if (!chat?.id) continue;

        const message =
          `Good news, ${chat.first_name || chat.username || "user"},\n\n` +
          `Your token ${tokenData.tokenName ?? "Unknown"} (${tokenData.tokenSymbol ?? "-"}) $IsLive.\n\n` +
          `View token: https://pump.fun/coin/${tokenData.tokenAddress}`;

        await bot.sendMessage(chat.id, message);
      }

      tokenData.hasNotified = true;
      await saveTokensToFile(storedTokens);
    }
  }
};

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: commands.map((cmd) => [
      { text: `${cmd.name} - ${cmd.description}`, callback_data: cmd.name },
    ]),
  };

  await bot.sendMessage(chatId, "Available commands:", {
    reply_markup: keyboard,
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  const command = query.data;

  if (!chatId || !command) return;

  switch (command) {
    case "/notify":
      await bot.sendMessage(
        chatId,
        "To subscribe for live token alerts, send the following command:\n\nExample:\n`/notify <token_address>pump`",
        { parse_mode: "Markdown" }
      );
      break;

    case "/menu":
      await bot.sendMessage(chatId, "You are already viewing the menu.");
      break;

    default:
      await bot.sendMessage(chatId, "Command not recognized.");
      break;
  }

  await bot.answerCallbackQuery(query.id);
});

/**
 * Interval configuration for live token checks (in minutes).
 * You can adjust this value as needed.
 */
const LIVE_CHECK_INTERVAL_MINUTES = 1;

/**
 * Initializes the periodic check for live tokens.
 */
const initializeLiveCheck = (): void => {
  const intervalMs = LIVE_CHECK_INTERVAL_MINUTES * 60 * 1000;

  setInterval(dispatchLiveTokenNotifications, intervalMs);
  dispatchLiveTokenNotifications();
};

bot.on("message", handleSubscriptionCommand);

initializeLiveCheck();
