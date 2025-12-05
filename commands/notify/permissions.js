/**
 * Permission checking utilities for the notify command
 */

/**
 * Check if a user has admin permissions in a group chat
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {number} userId - User ID
 * @returns {Promise<{isAdmin: boolean, error: string|null}>}
 */
const checkAdminPermissions = async (bot, chatId, userId) => {
    try {
        const chatMember = await bot.getChatMember(chatId, userId);
        const isAdmin = ["creator", "administrator"].includes(chatMember.status);

        return { isAdmin, error: null };
    } catch (error) {
        console.error("Error checking admin status:", error);
        return { isAdmin: false, error: "Error checking permissions. Please try again." };
    }
};

/**
 * Check if chat is a group or supergroup
 * @param {string} chatType - Chat type from message
 * @returns {boolean}
 */
const isGroupChat = (chatType) => {
    return chatType === "group" || chatType === "supergroup";
};

/**
 * Check if chat is a private chat
 * @param {string} chatType - Chat type from message
 * @returns {boolean}
 */
const isPrivateChat = (chatType) => {
    return chatType === "private";
};

module.exports = {
    checkAdminPermissions,
    isGroupChat,
    isPrivateChat
};
