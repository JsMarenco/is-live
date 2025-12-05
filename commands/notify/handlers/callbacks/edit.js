/**
 * Handle "Edit Alert Direction" callback
 */

const { formatTokenDisplay } = require("../../../../utils");
const { updateAlert } = require("../../database");
const { buildAlertViewKeyboard } = require("../../keyboards");
const { buildAlertViewMessage } = require("../../messages");

/**
 * Handle notify_edit callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleEditCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const [, tokenAddress, newDirection] = callbackQuery.data.split("|");

    // Get current alert to check if direction is already the same
    const { findAlertByToken } = require("../../database");
    const currentAlert = findAlertByToken(String(chatId), tokenAddress);

    if (!currentAlert) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Alert not found." });
        return;
    }

    // Check if direction is already the same
    if (currentAlert.direction === newDirection) {
        // Direction hasn't changed, just answer the callback
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    // Update alert with new direction
    const result = updateAlert(String(chatId), tokenAddress, msg.message_id, newDirection, 10);

    if (result.changes > 0) {
        const tokenDisplay = await formatTokenDisplay(tokenAddress);

        await bot.editMessageText(
            buildAlertViewMessage(tokenDisplay, tokenAddress, newDirection, 10),
            {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: buildAlertViewKeyboard(tokenAddress, newDirection),
            }
        );

        bot.answerCallbackQuery(callbackQuery.id, { text: `Updated to ${newDirection.toUpperCase()}!` });
    } else {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Failed to update alert." });
    }
};

module.exports = {
    handleEditCallback
};
