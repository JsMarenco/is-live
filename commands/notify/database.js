const { Connection, PublicKey } = require("@solana/web3.js");
const {
    getMint,
    TOKEN_2022_PROGRAM_ID
} = require("@solana/spl-token");
/**
 * Database operations for market cap alerts
 * Centralizes all database interactions for the notify command
 */
const { insertMarketCapAlert, findAlertsByChat, deleteMarketCapAlert, findTokensByChat } = require("../../db");

/**
 * Get all alerts for a specific chat
 * @param {string} chatId - Chat ID
 * @returns {Array} Array of alert objects
 */
const getAlertsByChat = (chatId) => {
    return findAlertsByChat.all(String(chatId));
};

/**
 * Get all tokens configured for a specific chat
 * @param {string} chatId - Chat ID
 * @returns {Array} Array of token objects
 */
const getTokensByChat = (chatId) => {
    return findTokensByChat.all(String(chatId));
};

/**
 * Check if an alert already exists for a token in a chat
 * @param {string} chatId - Chat ID
 * @param {string} tokenAddress - Token address
 * @returns {boolean}
 */
const alertExists = (chatId, tokenAddress) => {
    const existingAlerts = getAlertsByChat(chatId);
    return existingAlerts.some((alert) => alert.token_address === tokenAddress);
};

/**
 * Create a new market cap alert
 * @param {string} chatId - Chat ID
 * @param {string} tokenAddress - Token address
 * @param {number} messageId - Message ID
 * @param {string} direction - Alert direction ('up' or 'down')
 * @param {number} threshold - Threshold percentage (default: 10)
 * @returns {Object} Database operation result
 */
const createAlert = (chatId, tokenAddress, messageId, direction, threshold = 10) => {
    return insertMarketCapAlert.run(
        String(chatId),
        tokenAddress,
        messageId,
        "threshold",
        threshold,
        0,
        direction
    );
};

/**
 * Update an existing alert by deleting and recreating it
 * @param {string} chatId - Chat ID
 * @param {string} tokenAddress - Token address
 * @param {number} messageId - Message ID
 * @param {string} newDirection - New alert direction
 * @param {number} threshold - Threshold percentage (default: 10)
 * @returns {Object} Database operation result
 */
const updateAlert = (chatId, tokenAddress, messageId, newDirection, threshold = 10) => {
    // Delete old alert
    deleteMarketCapAlert.run(String(chatId), tokenAddress, "threshold");
    // Create new alert with updated direction
    return createAlert(chatId, tokenAddress, messageId, newDirection, threshold);
};

/**
 * Delete an alert
 * @param {string} chatId - Chat ID
 * @param {string} tokenAddress - Token address
 */
const removeAlert = (chatId, tokenAddress) => {
    deleteMarketCapAlert.run(String(chatId), tokenAddress, "threshold");
};

/**
 * Find a specific alert by token address
 * @param {string} chatId - Chat ID
 * @param {string} tokenAddress - Token address
 * @returns {Object|undefined} Alert object or undefined
 */
const findAlertByToken = (chatId, tokenAddress) => {
    const alerts = getAlertsByChat(chatId);
    return alerts.find((a) => a.token_address === tokenAddress);
};

module.exports = {
    getAlertsByChat,
    getTokensByChat,
    alertExists,
    createAlert,
    updateAlert,
    removeAlert,
    findAlertByToken
};
