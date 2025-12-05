require("dotenv").config();
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "subscriptions.db");

const db = new Database(DB_PATH);

db.prepare(
    `CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        token_address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        market_cap_usd INTEGER DEFAULT 0,   
        UNIQUE(chat_id, token_address)
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
        type TEXT NOT NULL, 
        threshold INTEGER NOT NULL,
        amount INTEGER NOT NULL, 
        direction TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, token_address)
    )`
).run();

db.prepare(
    `CREATE TABLE IF NOT EXISTS token_mc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_address TEXT NOT NULL,
        market_cap_usd INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
).run();

const insertTokenMC = db.prepare(
    "INSERT OR REPLACE INTO token_mc (token_address, market_cap_usd, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)"
);

const updateTokenMC = db.prepare(
    "UPDATE token_mc SET market_cap_usd = ?, last_updated = CURRENT_TIMESTAMP WHERE token_address = ?"
);

const findTokenMC = db.prepare(
    "SELECT market_cap_usd FROM token_mc WHERE token_address = ?"
);

const insertMarketCapAlert = db.prepare(
    "INSERT OR IGNORE INTO marketcap_alerts (chat_id, token_address, message_id, type, threshold, amount, direction) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
const deleteMarketCapAlert = db.prepare(
    "DELETE FROM marketcap_alerts WHERE chat_id = ? AND token_address = ? AND type = ?"
);
const insertSubscription = db.prepare(
    "INSERT OR IGNORE INTO subscriptions (chat_id, token_address) VALUES (?, ?)"
);

const findChatsByMarketCapAlert = db.prepare(
    "SELECT chat_id, message_id, type, threshold, amount, direction FROM marketcap_alerts WHERE token_address = ?"
);
const findChatsByToken = db.prepare(
    "SELECT DISTINCT chat_id FROM subscriptions WHERE token_address = ?"
);
const findTokensByChat = db.prepare(
    "SELECT token_address FROM subscriptions WHERE chat_id = ? ORDER BY created_at DESC"
);
const upsertPinnedMessage = db.prepare(
    `INSERT INTO pinned_messages (chat_id, token_address, message_id)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, token_address)
     DO UPDATE SET message_id = excluded.message_id`
);
const findPinnedMessagesByToken = db.prepare(
    "SELECT chat_id, message_id FROM pinned_messages WHERE token_address = ?"
);
const deletePinnedMessage = db.prepare(
    "DELETE FROM pinned_messages WHERE chat_id = ? AND token_address = ?"
);

module.exports = {
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
};
