/**
 * Handle "View Alert" callback
 */

const { formatTokenDisplay } = require("../../../../utils");
const { findAlertByToken } = require("../../database");
const { buildAlertViewKeyboard } = require("../../keyboards");
const { buildAlertViewMessage } = require("../../messages");

/**
 * Handle notify_view callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleViewCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const tokenAddress = callbackQuery.data.split("|")[1];

    const alert = findAlertByToken(String(chatId), tokenAddress);

    if (alert) {
        const tokenDisplay = await formatTokenDisplay(tokenAddress);

        await bot.editMessageText(
            buildAlertViewMessage(tokenDisplay, tokenAddress, alert.direction, alert.threshold),
            {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: buildAlertViewKeyboard(tokenAddress, alert.direction),
            }
        );
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleViewCallback
};
