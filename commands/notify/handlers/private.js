/**
 * Private chat handler for the notify command
 * Handles /notify command when used in private chats
 */

const { getAlertsByChat } = require("../database");
const { buildAlertListKeyboard, buildForceReplyKeyboard } = require("../keyboards");

/**
 * Handle /notify command in private chats
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Message object
 * @returns {Promise<void>}
 */
const handlePrivateNotify = async (bot, msg) => {
    const chatId = msg.chat.id;
    const alerts = getAlertsByChat(String(chatId));

    if (alerts.length > 0) {
        // User has existing alerts - show them
        const keyboard = await buildAlertListKeyboard(alerts);

        bot.sendMessage(chatId, "Your alerts:", {
            reply_markup: keyboard,
        });
    } else {
        // No alerts - prompt user to create one
        bot.sendMessage(
            chatId,
            "You don't have any alerts yet. Please enter a token address to create one:",
            {
                reply_markup: buildForceReplyKeyboard(),
            }
        );
    }
};

module.exports = {
    handlePrivateNotify
};
