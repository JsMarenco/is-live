/**
 * Handle "Create New Alert" callback
 */

const { buildForceReplyKeyboard } = require("../../keyboards");

/**
 * Handle notify_create callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleCreateCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    await bot.editMessageText("Please enter the token address for your new alert:", {
        chat_id: chatId,
        message_id: msg.message_id,
    });

    await bot.sendMessage(chatId, "Enter token address:", {
        reply_markup: buildForceReplyKeyboard(),
    });

    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleCreateCallback
};
