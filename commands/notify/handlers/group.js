/**
 * Group chat handler for the notify command
 * Handles /notify command when used in group chats
 */

const { formatTokenDisplay } = require("../../../utils");
const { checkAdminPermissions } = require("../permissions");
const { getTokensByChat } = require("../database");
const { setPendingAlert } = require("../storage");
const { buildDirectionKeyboard } = require("../keyboards");
const { buildGroupAlertConfigMessage, buildGroupNotificationMessage, buildStartDMMessage } = require("../messages");

/**
 * Handle /notify command in group chats
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Message object
 * @returns {Promise<void>}
 */
const handleGroupNotify = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user has admin permissions
    const { isAdmin, error } = await checkAdminPermissions(bot, chatId, userId);

    if (error) {
        bot.sendMessage(chatId, error);
        return;
    }

    if (!isAdmin) {
        bot.sendMessage(
            chatId,
            "Only admins and the owner can use this command in groups."
        );
        return;
    }

    // Get the group's configured token
    const groupTokens = getTokensByChat(String(chatId));

    if (groupTokens.length === 0) {
        bot.sendMessage(
            chatId,
            "This group hasn't been set up yet. Please use /setup <tokenAddress> first."
        );
        return;
    }

    const groupToken = groupTokens[0].token_address;
    const tokenDisplay = await formatTokenDisplay(groupToken);

    // Store pending alert for the user (they'll configure it in DM)
    const pendingKey = `${userId}`;
    setPendingAlert(pendingKey, {
        token: groupToken,
        direction: "up",
        threshold: 10,
        forGroup: chatId
    });

    // Notify in group
    const username = msg.from.username || msg.from.first_name;
    bot.sendMessage(
        chatId,
        buildGroupNotificationMessage(tokenDisplay, username)
    );

    // Send configuration interface to user's DM
    try {
        await bot.sendMessage(
            userId,
            buildGroupAlertConfigMessage(msg.chat.title, tokenDisplay, "up", 10),
            {
                reply_markup: buildDirectionKeyboard("up"),
            }
        );
    } catch (error) {
        const botUsername = (await bot.getMe()).username;
        bot.sendMessage(
            chatId,
            buildStartDMMessage(username, botUsername)
        );
    }
};

module.exports = {
    handleGroupNotify
};
