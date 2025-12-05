/**
 * Keyboard builders for the notify command
 * All inline keyboard markup construction is centralized here
 */

const { formatTokenDisplay } = require("../../utils");

/**
 * Build inline keyboard for direction selection
 * @param {string} currentDirection - Currently selected direction ('up' or 'down')
 * @returns {Object} Inline keyboard markup
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
 * @param {Array} alerts - Array of alert objects
 * @returns {Promise<Object>} Inline keyboard markup
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
 * @param {string} tokenAddress - Token address
 * @param {string} currentDirection - Current alert direction
 * @returns {Object} Inline keyboard markup
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
 * @returns {Object} Inline keyboard markup
 */
const buildBackKeyboard = () => {
    return {
        inline_keyboard: [[{ text: "⬅️ Back to Alerts", callback_data: "notify_back" }]],
    };
};

/**
 * Build keyboard for force reply (to get user input)
 * @returns {Object} Force reply markup
 */
const buildForceReplyKeyboard = () => {
    return {
        force_reply: true,
    };
};

module.exports = {
    buildDirectionKeyboard,
    buildAlertListKeyboard,
    buildAlertViewKeyboard,
    buildBackKeyboard,
    buildForceReplyKeyboard
};
