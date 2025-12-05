/**
 * Handle "Back to Alerts" callback
 */

const { getAlertsByChat } = require("../../database");

/**
 * Handle notify_back callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
const handleBackCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const alerts = getAlertsByChat(String(chatId));

    if (alerts.length > 0) {
        const alertButtons = alerts.map((alert) => [
            {
                text: `${alert.token_address.substring(0, 8)}... - ${alert.direction.toUpperCase()} ${alert.threshold}%`,
                callback_data: `notify_view|${alert.token_address}`,
            },
        ]);

        alertButtons.push([{ text: "➕ Create New Alert", callback_data: "notify_create" }]);

        await bot.editMessageText("Your alerts:", {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: alertButtons,
            },
        });
    } else {
        await bot.editMessageText("You don't have any alerts.", {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [[{ text: "➕ Create New Alert", callback_data: "notify_create" }]],
            },
        });
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleBackCallback
};
