/**
 * Handle "Change Direction" callback
 */

const { getPendingAlert, setPendingAlert } = require("../../storage");
const { buildDirectionKeyboard } = require("../../keyboards");
const { buildAlertConfigMessage } = require("../../messages");

/**
 * Handle notify_dir callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleDirectionCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const direction = callbackQuery.data.split("|")[1];
    const pendingKey = `${chatId}`;

    const pending = getPendingAlert(pendingKey);

    if (!pending) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please start over." });
        return;
    }

    // Check if direction has actually changed
    if (pending.direction === direction) {
        // Direction hasn't changed, just answer the callback without updating message
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    // Update direction
    pending.direction = direction;
    setPendingAlert(pendingKey, pending);

    // Update message with new direction
    await bot.editMessageText(
        buildAlertConfigMessage(pending.token, direction, pending.threshold || 10),
        {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: buildDirectionKeyboard(direction),
        }
    );

    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleDirectionCallback
};
