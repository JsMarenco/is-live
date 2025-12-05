/**
 * Notify Command - Main Entry Point
 * Allows users to set up market cap alerts for tokens
 * 
 * This is the refactored version with modular structure:
 * - permissions.js: Permission checking utilities
 * - storage.js: In-memory pending alerts storage
 * - database.js: Database operations for alerts
 * - keyboards.js: Inline keyboard builders
 * - messages.js: Message text builders
 * - handlers/group.js: Group chat handler
 * - handlers/private.js: Private chat handler
 * - handlers/reply.js: Token address input handler
 * - handlers/callbacks/: Individual callback handlers
 */

const { isGroupChat, isPrivateChat } = require("./permissions");
const { handleGroupNotify } = require("./handlers/group");
const { handlePrivateNotify } = require("./handlers/private");
const { handleReply } = require("./handlers/reply");
const { handleCallback } = require("./handlers/callbacks");

/**
 * Main handler for /notify command
 * Routes to appropriate handler based on chat type
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Message object
 * @returns {Promise<void>}
 */
const handleNotify = async (bot, msg) => {
    const chatType = msg.chat.type;

    if (isGroupChat(chatType)) {
        await handleGroupNotify(bot, msg);
    } else if (isPrivateChat(chatType)) {
        await handlePrivateNotify(bot, msg);
    }
};

module.exports = {
    regex: /^\/notify(?:@[\w_]+)?$/,
    handler: handleNotify,
    handleReply,
    handleCallback,
};
