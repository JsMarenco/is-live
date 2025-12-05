/**
 * Handle "Delete Alert" callback
 */

const { removeAlert } = require("../../database");
const { buildBackKeyboard } = require("../../keyboards");

/**
 * Handle notify_delete callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleDeleteCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const tokenAddress = callbackQuery.data.split("|")[1];

    removeAlert(String(chatId), tokenAddress);

    await bot.editMessageText(`Alert for ${tokenAddress} deleted.`, {
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: buildBackKeyboard(),
    });

    bot.answerCallbackQuery(callbackQuery.id, { text: "Alert deleted!" });
};

module.exports = {
    handleDeleteCallback
};
