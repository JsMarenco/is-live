/**
 * Notify Command - Main Entry Point
 * Allows users to set up market cap alerts for tokens
 *
 * Optimized structure:
 * - index.js: Main entry point and handlers
 * - callbacks.js: Callback handlers
 * - utils.js: Utilities (Permissions, Storage, Messages, Keyboards)
 * - database.js: Database operations
 */

const { isValidMint, normalizeMint, formatTokenDisplay } = require("../../utils");
const {
    checkAdminPermissions,
    isGroupChat,
    isPrivateChat,
    setPendingAlert,
    buildDirectionKeyboard,
    buildGroupAlertConfigMessage,
    buildGroupNotificationMessage,
    buildStartDMMessage,
    buildAlertListKeyboard,
    buildAlertConfigMessage
} = require("./utils");
const {
    getAlertsByChat,
    alertExists
} = require("./database");
const { handleCallback } = require("./callbacks");

/**
 * Handle /notify command in group chats
 */
/**
 * Handle /notify command in group chats
 */
const handleGroupNotify = async (bot, msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const tokenAddress = match?.[1]?.trim();

    // 1. Check if group already has a mint configured
    const existingAlerts = getAlertsByChat(String(chatId));
    if (existingAlerts.length > 0) {
        const alert = existingAlerts[0];
        const tokenDisplay = await formatTokenDisplay(alert.token_address);
        bot.sendMessage(chatId, `This group is already tracking: ${tokenDisplay}\n\nTo change this, an admin must first remove the bot or contact support (Group configurations are permanent per session).`);
        return;
    }

    // 2. Check Admin Permissions
    const { isAdmin, error } = await checkAdminPermissions(bot, chatId, userId);

    if (error) {
        bot.sendMessage(chatId, error);
        return;
    }

    if (!isAdmin) {
        bot.sendMessage(chatId, "⚠️ Only group administrators can configure the notification mint.");
        return;
    }

    // 3. If no token provided, ask for it
    if (!tokenAddress) {
        bot.sendMessage(chatId, "To configure the group mint, please use:\n/notify <tokenAddress>");
        return;
    }

    // 4. Validate Token
    const normalized = normalizeMint(tokenAddress);

    if (!isValidMint(normalized)) {
        bot.sendMessage(chatId, "Invalid token address. Please try again.");
        return;
    }

    const tokenDisplay = await formatTokenDisplay(normalized);

    // 5. Present Configuration Options in Group
    const { buildGroupSetupKeyboard } = require("./utils");
    bot.sendMessage(
        chatId,
        `Configuring group alerts for: ${tokenDisplay}\n\nSelect the alert type to enable notifications:`,
        {
            reply_markup: buildGroupSetupKeyboard(normalized)
        }
    );
};

/**
 * Handle /notify command in private chats
 */
const handlePrivateNotify = async (bot, msg, match) => {
    const chatId = msg.chat.id;
    const tokenAddress = match?.[1]?.trim();

    // 1. If no token provided, show Main Menu
    if (!tokenAddress) {
        const { buildMainMenuKeyboard } = require("./utils");
        bot.sendMessage(
            chatId,
            "🔔 *Notification Manager*\n\nManage your personal alerts here. What would you like to do?",
            {
                parse_mode: "Markdown",
                reply_markup: buildMainMenuKeyboard()
            }
        );
        return;
    }

    // 2. If token provided, proceed to add it
    const normalized = normalizeMint(tokenAddress);

    if (!isValidMint(normalized)) {
        bot.sendMessage(chatId, "Invalid token address. Please try again.");
        return;
    }

    if (alertExists(String(chatId), normalized)) {
        bot.sendMessage(chatId, `You already have an alert for this token: ${normalized}`);
        return;
    }

    const pendingKey = `${chatId}`;
    setPendingAlert(pendingKey, {
        token: normalized,
        direction: "up",
        threshold: 10
    });

    bot.sendMessage(
        chatId,
        buildAlertConfigMessage(normalized, "up", 10),
        {
            reply_markup: buildDirectionKeyboard("up"),
        }
    );
};

/**
 * Handle reply messages (when user enters a token address)
 */
const handleReply = (bot, msg) => {
    const chatId = msg.chat.id;
    const tokenAddress = msg.text?.trim();

    if (!tokenAddress) {
        bot.sendMessage(chatId, "Please provide a valid token address.");
        return;
    }

    const normalized = normalizeMint(tokenAddress);

    if (!isValidMint(normalized)) {
        bot.sendMessage(chatId, "Invalid token address. Please try again.");
        return;
    }

    if (alertExists(String(chatId), normalized)) {
        bot.sendMessage(chatId, `You already have an alert for this token: ${normalized}`);
        return;
    }

    const pendingKey = `${chatId}`;
    setPendingAlert(pendingKey, {
        token: normalized,
        direction: "up",
        threshold: 10
    });

    bot.sendMessage(
        chatId,
        buildAlertConfigMessage(normalized, "up", 10),
        {
            reply_markup: buildDirectionKeyboard("up"),
        }
    );
};

/**
 * Main handler for /notify command
 */
const handleNotify = async (bot, msg, match) => {
    const chatType = msg.chat.type;

    if (isGroupChat(chatType)) {
        await handleGroupNotify(bot, msg, match);
    } else if (isPrivateChat(chatType)) {
        await handlePrivateNotify(bot, msg, match);
    }
};

module.exports = {
    regex: /^\/notify(?:@[\w_]+)?(?:\s+(.+))?$/,
    handler: handleNotify,
    handleReply,
    handleCallback,
};
