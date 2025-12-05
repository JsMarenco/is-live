/**
 * Callback handler router
 * Routes callback queries to appropriate handlers based on callback data
 */

const { handleCreateCallback } = require("./create");
const { handleViewCallback } = require("./view");
const { handleEditCallback } = require("./edit");
const { handleDeleteCallback } = require("./delete");
const { handleBackCallback } = require("./back");
const { handleDirectionCallback } = require("./direction");
const { handleSaveCallback } = require("./save");
const { handleCancelCallback } = require("./cancel");

/**
 * Main callback handler - routes to specific handlers based on callback data
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleCallback = async (bot, callbackQuery) => {
    const data = callbackQuery.data;

    // Route to appropriate handler based on callback data
    if (data === "notify_create") {
        await handleCreateCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_view")) {
        await handleViewCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_edit")) {
        await handleEditCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_delete")) {
        await handleDeleteCallback(bot, callbackQuery);
    } else if (data === "notify_back") {
        await handleBackCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_dir")) {
        await handleDirectionCallback(bot, callbackQuery);
    } else if (data === "notify_save") {
        await handleSaveCallback(bot, callbackQuery);
    } else if (data === "notify_cancel") {
        await handleCancelCallback(bot, callbackQuery);
    }
};

module.exports = {
    handleCallback
};
