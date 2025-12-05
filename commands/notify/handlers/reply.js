/**
 * Reply handler for the notify command
 * Handles user input when they enter a token address
 */

const { isValidMint, normalizeMint } = require("../../../utils");
const { alertExists } = require("../database");
const { setPendingAlert } = require("../storage");
const { buildDirectionKeyboard } = require("../keyboards");
const { buildAlertConfigMessage } = require("../messages");

/**
 * Handle reply messages (when user enters a token address)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Message object
 * @returns {void}
 */
const handleReply = (bot, msg) => {
    console.log("handleReply called with:", msg.text);
    const chatId = msg.chat.id;
    const tokenAddress = msg.text?.trim();

    if (!tokenAddress) {
        console.log("No token address provided");
        bot.sendMessage(chatId, "Please provide a valid token address.");
        return;
    }

    const normalized = normalizeMint(tokenAddress);
    console.log("Normalized address:", normalized);

    if (!isValidMint(normalized)) {
        console.log("Invalid mint:", normalized);
        bot.sendMessage(chatId, "Invalid token address. Please try again.");
        return;
    }

    // Check if alert already exists
    if (alertExists(String(chatId), normalized)) {
        console.log("Alert already exists for:", normalized);
        bot.sendMessage(
            chatId,
            `You already have an alert for this token: ${normalized}`
        );
        return;
    }

    // Store pending alert with default direction
    const pendingKey = `${chatId}`;
    setPendingAlert(pendingKey, {
        token: normalized,
        direction: "up",
        threshold: 10
    });

    console.log("Sending direction selection interface");
    bot.sendMessage(
        chatId,
        buildAlertConfigMessage(normalized, "up", 10),
        {
            reply_markup: buildDirectionKeyboard("up"),
        }
    );
};

module.exports = {
    handleReply
};
