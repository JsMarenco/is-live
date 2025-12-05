/**
 * Handle "Cancel" callback
 */

const { deletePendingAlert } = require("../../storage");
const { buildBackKeyboard } = require("../../keyboards");

/**
 * Handle notify_cancel callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleCancelCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const pendingKey = `${chatId}`;

    deletePendingAlert(pendingKey);

    await bot.editMessageText("Alert creation cancelled.", {
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: buildBackKeyboard(),
    });

    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleCancelCallback
};
