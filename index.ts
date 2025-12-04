require('dotenv').config();
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');
const { io } = require('socket.io-client');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SOCKET_URL = process.env.SOCKET_URL;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'subscriptions.db');

if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN environment variable.');
    process.exit(1);
}

const db = new Database(DB_PATH);
db.prepare(
    `CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        token_address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, token_address),
        market_cap_usd REAL DEFAULT 0
    )`
).run();


db.prepare(
    `CREATE TABLE IF NOT EXISTS pinned_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        token_address TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, token_address)
    )`
).run();

db.prepare(
    `CREATE TABLE IF NOT EXISTS marketcap_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        token_address TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        type TEXT NOT NULL, //threshold or amount
        threshold INTEGER NOT NULL,
        amount INTEGER NOT NULL, 
        direction TEXT NOT NULL, //up or down
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, token_address)
    )`
).run();

db.prepare(
    `CREATE TABLE IF NOT EXISTS token_mc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_address TEXT NOT NULL,
        market_cap_usd REAL DEFAULT 0
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
).run();

const insertTokenMC = db.prepare(
    'INSERT OR REPLACE INTO token_mc (token_address, market_cap_usd, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)'
);

const updateTokenMC = db.prepare(
    'UPDATE token_mc SET market_cap_usd = ?, last_updated = CURRENT_TIMESTAMP WHERE token_address = ?'
);

const findTokenMC = db.prepare(
    'SELECT market_cap_usd FROM token_mc WHERE token_address = ?'
);

const insertMarketCapAlert = db.prepare(
    'INSERT OR IGNORE INTO marketcap_alerts (chat_id, token_address, message_id, type, threshold, amount, direction) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const deleteMarketCapAlert = db.prepare(
    'DELETE FROM marketcap_alerts WHERE chat_id = ? AND token_address = ? AND type = ?'
);
const insertSubscription = db.prepare(
    'INSERT OR IGNORE INTO subscriptions (chat_id, token_address) VALUES (?, ?)'
);

const findChatsByMarketCapAlert = db.prepare(
    'SELECT chat_id, message_id, type, threshold, amount, direction FROM marketcap_alerts WHERE token_address = ?'
);
const findChatsByToken = db.prepare(
    'SELECT DISTINCT chat_id FROM subscriptions WHERE token_address = ?'
);
const findTokensByChat = db.prepare(
    'SELECT token_address FROM subscriptions WHERE chat_id = ? ORDER BY created_at DESC'
);
const upsertPinnedMessage = db.prepare(
    `INSERT INTO pinned_messages (chat_id, token_address, message_id)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, token_address)
     DO UPDATE SET message_id = excluded.message_id`
);
const findPinnedMessagesByToken = db.prepare(
    'SELECT chat_id, message_id FROM pinned_messages WHERE token_address = ?'
);
const deletePinnedMessage = db.prepare(
    'DELETE FROM pinned_messages WHERE chat_id = ? AND token_address = ?'
);

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const normalizeMint = (raw) => raw.replace(/\s+/g, '').trim();
const isValidMint = (mint) => /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(mint);

const formatStreamLabel = (stream) => {
    const label = stream.name || stream.symbol || 'Unnamed token';
    return `${label}`;
};

const formatLiveMessage = (stream) => {
    const title = stream.livestream_title ? `\n\n🎬 ${stream.livestream_title}` : '';
    const viewers = typeof stream.viewers === 'number' ? `\n👀 Viewers: ${stream.viewers} \n💰Market Cap: ${stream.market_cap_usd}\n👤Holders: ${stream.holders}` : '';
    return `🟢 ${formatStreamLabel(stream)} is LIVE!${title}${viewers}🚀`;
};

const fetchCoinData = async (mint) => {
    try {
        const response = await fetch(`https://data.pumpmod.live/coin/${mint}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch coin data:', error);
        return null;
    }
}

const formatMarketcapMessage = (stream) => {
    return `📈 ${formatStreamLabel(stream)} market cap updated: $${stream.market_cap_usd.toLocaleString()}`;
}

const formatOfflineMessage = (stream) => `🔴 ${formatStreamLabel(stream)} went offline.`;

const subscribeToToken = async (chatId, tokenAddress) => {
    const normalized = normalizeMint(tokenAddress);

    if (!isValidMint(normalized)) {
        return { ok: false, message: 'Please provide a valid Solana token address.' };
    }

    const result = insertSubscription.run(String(chatId), normalized);
    if (result.changes === 0) {
        return { ok: true, message: 'You are already subscribed to this token.' };
    }
    const coinData = await fetchCoinData(tokenAddress);
    return {
        ok: true,
        message: `Subscribed! You will be notified when ${coinData?.name || normalized} goes live or offline.`,
    };
};

const listSubscriptionsForChat = (chatId) => {
    const rows = findTokensByChat.all(String(chatId));
    if (!rows.length) {
        return 'You have no subscriptions yet. Use /setup <tokenAddress> to add one.';
    }

    const lines = rows.map((row, index) => `${index + 1}. ${row.name || row.token_address}`);
    return `Your subscriptions:\n${lines.join('\n')}`;
};

const buildPumpFunButton = (mint) => ({
    reply_markup: {
        inline_keyboard: [[{ text: 'Open on Pumpfun', url: `https://pump.fun/coin/${mint}` }]],
    },
});

const sendMessageBatch = async (chatRows, text, options) => {
    const sendPromises = chatRows.map((row) =>
        bot.sendMessage(row.chat_id, text, options).catch((error) => {
            console.warn(`Failed to send message to chat ${row.chat_id}`, error.message);
        })
    );
    await Promise.all(sendPromises);
};

const notifyChatsStreamLive = async (chats, stream) => {
    const options = buildPumpFunButton(stream.mint);
    for (const row of chats) {
        try {
            const sentMessage = await bot.sendMessage(row.chat_id, formatLiveMessage(stream), options);
            await bot.pinChatMessage(row.chat_id, sentMessage.message_id, { disable_notification: true });
            upsertPinnedMessage.run(row.chat_id, stream.mint, sentMessage.message_id);
        } catch (error) {
            console.warn(`Failed to notify or pin chat ${row.chat_id}`, error.message);
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
            console.warn(`Failed to unpin message ${row.message_id} in chat ${row.chat_id}`, error.message);
        } finally {
            deletePinnedMessage.run(row.chat_id, tokenAddress);
        }
    });

    await Promise.all(operations);
};

bot.onText(/^\/setup(?:@[\w_]+)?\s+(\S+)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const tokenAddress = match?.[1] || '';
    const response = await subscribeToToken(chatId, tokenAddress);
    bot.sendMessage(chatId, response.message);
});

// bot.onText(/^\/list(?:@[\w_]+)?$/, (msg) => {
//     const chatId = msg.chat.id;
//     bot.sendMessage(chatId, listSubscriptionsForChat(chatId));
// });

bot.onText(/^\/help(?:@[\w_]+)?$/, (msg) => {
    const helpText =
        '$ITSLIVE Livestream Bot commands:\n' +
        '/setup <tokenAddress> - Subscribe to a token\n'
    // '/list - Show your current subscriptions';
    bot.sendMessage(msg.chat.id, helpText);
});

const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnectionDelayMax: 10000,
    auth: SOCKET_API_KEY ? { apiKey: SOCKET_API_KEY } : undefined,
});

socket.on('connect', () => {
    console.log('Connected to websocket', socket.id);
});

socket.on('connect_error', (error) => {
    console.warn('Websocket connection failed', error.message);
});

socket.on('disconnect', (reason) => {
    console.warn('Disconnected from websocket', reason);
});

socket.on('nowLive', async (stream) => {
    if (!stream?.mint) {
        return;
    }
    const chats = findChatsByToken.all(stream.mint);
    if (!chats.length) {
        return;
    }
    await notifyChatsStreamLive(chats, stream);
});


socket.on('market_cap_update', async (stream) => {
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
            if (type === 'threshold') {
                if (isUp && direction === 'up' && percentChange >= threshold) {
                    shouldNotify = true;
                } else if (!isUp && direction === 'down' && percentChange >= threshold) {
                    shouldNotify = true;
                }

            } else if (type === 'amount') {
                if (mcChange >= amount) {
                    if (direction === 'up' && isUp) {
                        shouldNotify = true;
                    } else if (direction === 'down' && !isUp) {
                        shouldNotify = true;
                    }
                }
            }
            if (shouldNotify) {
                await bot.editMessageText(formatMarketcapMessage(stream, percentChange, isUp, amount), {
                    chat_id: pinned.chat_id,
                    message_id: pinned.message_id,
                    ...options,
                });
            }

        } catch (error) {
            console.warn(`Failed to update message in chat ${row.chat_id}`, error.message);

        }
    }
});



socket.on('streamOffline', async (stream) => {
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

process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    socket.close();
    bot.stopPolling();
    db.close();
    process.exit(0);
});
