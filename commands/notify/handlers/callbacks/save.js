/**
 * Handle "Save Alert" callback
 */

const { getPendingAlert, deletePendingAlert } = require("../../storage");
const { createAlert } = require("../../database");
const { buildBackKeyboard } = require("../../keyboards");
const { buildAlertCreatedMessage } = require("../../messages");

/**
 * Handle notify_save callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleSaveCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const pendingKey = `${chatId}`;

    const pending = getPendingAlert(pendingKey);

    if (!pending) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please start over." });
        return;
    }

    const result = createAlert(
        String(chatId),
        pending.token,
        msg.message_id,
        pending.direction,
        pending.threshold || 10
    );

    console.log("Insert result:", result);

    if (result.changes === 0) {
        await bot.editMessageText(`You already have an alert set for ${pending.token}.`, {
            chat_id: chatId,
            message_id: msg.message_id,
        });
    } else {
        await bot.editMessageText(
            buildAlertCreatedMessage(pending.token, pending.direction, pending.threshold || 10),
            {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: buildBackKeyboard(),
            }
        );
    }

    deletePendingAlert(pendingKey);
    bot.answerCallbackQuery(callbackQuery.id, { text: "Alert saved!" });
};

module.exports = {
    handleSaveCallback
};
