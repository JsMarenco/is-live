/**
 * Utilities for the notify command
 * Consolidates permissions, storage, messages, and keyboards
 */

const { formatTokenDisplay } = require("../../utils");

// ==========================================
// PERMISSIONS
// ==========================================

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

// ==========================================
// STORAGE (In-Memory)
// ==========================================

const pendingAlerts = new Map();

/**
 * Store a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 * @param {Object} alertData - Alert configuration data
 */
const setPendingAlert = (key, alertData) => {
    pendingAlerts.set(key, alertData);
};

/**
 * Retrieve a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 * @returns {Object|undefined} Alert configuration or undefined
 */
const getPendingAlert = (key) => {
    return pendingAlerts.get(key);
};

/**
 * Delete a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 */
const deletePendingAlert = (key) => {
    pendingAlerts.delete(key);
};

/**
 * Check if a pending alert exists
 * @param {string} key - Unique key (userId or chatId)
 * @returns {boolean}
 */
const hasPendingAlert = (key) => {
    return pendingAlerts.has(key);
};

// ==========================================
// MESSAGES
// ==========================================

/**
 * Build message text for alert configuration
 */
const buildAlertConfigMessage = (token, direction, threshold = 10) => {
    return `Token: ${token}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nSelect direction and click Save:`;
};

/**
 * Build message text for group alert configuration (sent to DM)
 */
const buildGroupAlertConfigMessage = (groupTitle, tokenDisplay, direction, threshold = 10) => {
    return `Configuring alert for group: ${groupTitle}\nToken: ${tokenDisplay}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nSelect direction and save:`;
};

/**
 * Build message text for alert view/edit
 */
const buildAlertViewMessage = (tokenDisplay, tokenAddress, direction, threshold) => {
    return `Token: ${tokenDisplay}\nAddress: ${tokenAddress}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nEdit direction or delete:`;
};

/**
 * Build success message for created alert
 */
const buildAlertCreatedMessage = (token, direction, threshold = 10) => {
    return `✅ Alert created!\n\nToken: ${token}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%`;
};

/**
 * Build message for group notification
 */
const buildGroupNotificationMessage = (tokenDisplay, username) => {
    return `Configuring alert for ${tokenDisplay}\n\n@${username}, check your private messages.`;
};

/**
 * Build message for when user needs to start DM with bot
 */
const buildStartDMMessage = (username, botUsername) => {
    return `@${username}, please start a private chat with me first by clicking: @${botUsername}`;
};

// ==========================================
// KEYBOARDS
// ==========================================

/**
 * Build inline keyboard for direction selection
 */
const buildDirectionKeyboard = (currentDirection) => {
    return {
        inline_keyboard: [
            [
                {
                    text: currentDirection === "up" ? "✅ UP" : "📈 UP",
                    callback_data: "notify_dir|up"
                },
                {
                    text: currentDirection === "down" ? "✅ DOWN" : "📉 DOWN",
                    callback_data: "notify_dir|down"
                },
            ],
            [{ text: "💾 Save Alert", callback_data: "notify_save" }],
            [{ text: "❌ Cancel", callback_data: "notify_cancel" }],
        ],
    };
};

/**
 * Build inline keyboard for alert list
 */
const buildAlertListKeyboard = async (alerts) => {
    const alertButtons = await Promise.all(
        alerts.map(async (alert) => {
            const tokenDisplay = await formatTokenDisplay(alert.token_address);
            return [
                {
                    text: `${tokenDisplay} - ${alert.direction.toUpperCase()} ${alert.threshold}%`,
                    callback_data: `notify_view|${alert.token_address}`,
                },
            ];
        })
    );

    alertButtons.push([
        { text: "➕ Create New Alert", callback_data: "notify_create" },
    ]);

    return {
        inline_keyboard: alertButtons,
    };
};

/**
 * Build inline keyboard for viewing/editing a specific alert
 */
const buildAlertViewKeyboard = (tokenAddress, currentDirection) => {
    return {
        inline_keyboard: [
            [
                {
                    text: currentDirection === "up" ? "✅ UP" : "📈 UP",
                    callback_data: `notify_edit|${tokenAddress}|up`
                },
                {
                    text: currentDirection === "down" ? "✅ DOWN" : "📉 DOWN",
                    callback_data: `notify_edit|${tokenAddress}|down`
                },
            ],
            [{ text: "🗑️ Delete Alert", callback_data: `notify_delete|${tokenAddress}` }],
            [{ text: "⬅️ Back", callback_data: "notify_back" }],
        ],
    };
};

/**
 * Build keyboard with back button
 */
const buildBackKeyboard = () => {
    return {
        inline_keyboard: [[{ text: "⬅️ Back to Alerts", callback_data: "notify_back" }]],
    };
};

/**
 * Build keyboard for force reply (to get user input)
 */
const buildForceReplyKeyboard = () => {
    return {
        force_reply: true,
    };
};

/**
 * Build main menu keyboard for private chat
 */
const buildMainMenuKeyboard = () => {
    return {
        inline_keyboard: [
            [
                { text: "➕ Add Mint", callback_data: "notify_create" },
                { text: "📋 List Mints", callback_data: "notify_list" }
            ],
            [{ text: "🗑️ Remove Mint", callback_data: "notify_remove_menu" }]
        ]
    };
};

/**
 * Build setup keyboard for group chat
 * @param {string} tokenAddress - Token address to setup
 */
const buildGroupSetupKeyboard = (tokenAddress) => {
    return {
        inline_keyboard: [
            [
                { text: "📈 UP 10%", callback_data: `group_setup|${tokenAddress}|up` },
                { text: "📉 DOWN 10%", callback_data: `group_setup|${tokenAddress}|down` }
            ],
            [{ text: "❌ Cancel", callback_data: "notify_cancel_group" }]
        ]
    };
};

module.exports = {
    // Permissions
    checkAdminPermissions,
    isGroupChat,
    isPrivateChat,
    // Storage
    setPendingAlert,
    getPendingAlert,
    deletePendingAlert,
    hasPendingAlert,
    // Messages
    buildAlertConfigMessage,
    buildGroupAlertConfigMessage,
    buildAlertViewMessage,
    buildAlertCreatedMessage,
    buildGroupNotificationMessage,
    buildStartDMMessage,
    // Keyboards
    buildDirectionKeyboard,
    buildAlertListKeyboard,
    buildAlertViewKeyboard,
    buildBackKeyboard,
    buildForceReplyKeyboard,
    buildMainMenuKeyboard,
    buildGroupSetupKeyboard
};
