/**
 * Callback handlers for the notify command
 * Consolidated all callback logic into a single file
 */

const { formatTokenDisplay } = require("../../utils");
const {
    findAlertByToken,
    updateAlert,
    removeAlert,
    getAlertsByChat,
    createAlert
} = require("./database");
const {
    buildForceReplyKeyboard,
    buildAlertViewMessage,
    buildAlertViewKeyboard,
    buildBackKeyboard,
    getPendingAlert,
    setPendingAlert,
    deletePendingAlert,
    buildAlertConfigMessage,
    buildDirectionKeyboard,
    buildAlertCreatedMessage
} = require("./utils");

/**
 * Handle "Create New Alert" callback
 */
const handleCreateCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    try {
        await bot.editMessageText("Please enter the token address for your new alert:", {
            chat_id: chatId,
            message_id: msg.message_id,
        });
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleCreateCallback:", error);
        }
    }

    await bot.sendMessage(chatId, "Enter token address:", {
        reply_markup: buildForceReplyKeyboard(),
    });

    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Handle "View Alert" callback
 */
const handleViewCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const tokenAddress = callbackQuery.data.split("|")[1];

    const alert = findAlertByToken(String(chatId), tokenAddress);

    if (alert) {
        const tokenDisplay = await formatTokenDisplay(tokenAddress);

        try {
            await bot.editMessageText(
                buildAlertViewMessage(tokenDisplay, tokenAddress, alert.direction, alert.threshold),
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: buildAlertViewKeyboard(tokenAddress, alert.direction),
                }
            );
        } catch (error) {
            if (!error.message?.includes("message is not modified")) {
                console.error("Error in handleViewCallback:", error);
            }
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Handle "Edit Alert Direction" callback
 */
const handleEditCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const [, tokenAddress, newDirection] = callbackQuery.data.split("|");

    const currentAlert = findAlertByToken(String(chatId), tokenAddress);

    if (!currentAlert) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Alert not found." });
        return;
    }

    if (currentAlert.direction === newDirection) {
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    const result = updateAlert(String(chatId), tokenAddress, msg.message_id, newDirection, 10);

    if (result.changes > 0) {
        const tokenDisplay = await formatTokenDisplay(tokenAddress);

        try {
            await bot.editMessageText(
                buildAlertViewMessage(tokenDisplay, tokenAddress, newDirection, 10),
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: buildAlertViewKeyboard(tokenAddress, newDirection),
                }
            );
        } catch (error) {
            if (!error.message?.includes("message is not modified")) {
                console.error("Error in handleEditCallback:", error);
            }
        }

        bot.answerCallbackQuery(callbackQuery.id, { text: `Updated to ${newDirection.toUpperCase()}!` });
    } else {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Failed to update alert." });
    }
};

/**
 * Handle "Delete Alert" callback
 */
const handleDeleteCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const tokenAddress = callbackQuery.data.split("|")[1];

    removeAlert(String(chatId), tokenAddress);

    try {
        await bot.editMessageText(`Alert for ${tokenAddress} deleted.`, {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: buildBackKeyboard(),
        });
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleDeleteCallback:", error);
        }
    }

    bot.answerCallbackQuery(callbackQuery.id, { text: "Alert deleted!" });
};

/**
 * Handle "Back to Alerts" callback
 */
const handleBackCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const alerts = getAlertsByChat(String(chatId));

    try {
        if (alerts.length > 0) {
            const alertButtons = await Promise.all(alerts.map(async (alert) => {
                // We need to format token display here too, or just use address if format is slow
                // Ideally we should use formatTokenDisplay but it's async and map expects sync or Promise.all
                // The original code used substring(0, 8) which is synchronous.
                // Let's check original code.
                // Original code: text: `${alert.token_address.substring(0, 8)}... - ${alert.direction.toUpperCase()} ${alert.threshold}%`,
                // So it didn't use formatTokenDisplay. I'll stick to original behavior for speed/consistency.
                return [
                    {
                        text: `${alert.token_address.substring(0, 8)}... - ${alert.direction.toUpperCase()} ${alert.threshold}%`,
                        callback_data: `notify_view|${alert.token_address}`,
                    },
                ];
            }));

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
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleBackCallback:", error);
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Handle "Change Direction" callback
 */
const handleDirectionCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const direction = callbackQuery.data.split("|")[1];
    const pendingKey = `${chatId}`;

    const pending = getPendingAlert(pendingKey);

    if (!pending) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please start over." });
        return;
    }

    if (pending.direction === direction) {
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    pending.direction = direction;
    setPendingAlert(pendingKey, pending);

    try {
        await bot.editMessageText(
            buildAlertConfigMessage(pending.token, direction, pending.threshold || 10),
            {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: buildDirectionKeyboard(direction),
            }
        );
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleDirectionCallback:", error);
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Handle "Save Alert" callback
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

    const targetChatId = pending.forGroup ? String(pending.forGroup) : String(chatId);

    const result = createAlert(
        targetChatId,
        pending.token,
        msg.message_id,
        pending.direction,
        pending.threshold || 10
    );

    try {
        if (result.changes === 0) {
            await bot.editMessageText(`You already have an alert set for ${pending.token}.`, {
                chat_id: chatId,
                message_id: msg.message_id,
            });
        } else {
            const successMessage = pending.forGroup
                ? `✅ Group alert created!\n\nToken: ${pending.token}\nDirection: ${pending.direction.toUpperCase()}\nThreshold: ${pending.threshold || 10}%\n\nThe group will be notified when this alert triggers.`
                : buildAlertCreatedMessage(pending.token, pending.direction, pending.threshold || 10);

            await bot.editMessageText(
                successMessage,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: buildBackKeyboard(),
                }
            );
        }
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleSaveCallback:", error);
        }
    }

    deletePendingAlert(pendingKey);
    bot.answerCallbackQuery(callbackQuery.id, { text: "Alert saved!" });
};

/**
 * Handle "Cancel" callback
 */
const handleCancelCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const pendingKey = `${chatId}`;

    deletePendingAlert(pendingKey);

    try {
        await bot.editMessageText("Alert creation cancelled.", {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: buildBackKeyboard(),
        });
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleCancelCallback:", error);
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Main callback handler - routes to specific handlers based on callback data
 */
const handleCallback = async (bot, callbackQuery) => {
    const data = callbackQuery.data;

    if (data === "notify_create") {
        await handleCreateCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_view")) {
        await handleViewCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_edit")) {
        await handleEditCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_delete")) {
        await handleDeleteCallback(bot, callbackQuery);
    } else if (data === "notify_back") {
        await handleBackCallback(bot, callbackQuery);
    } else if (data.startsWith("notify_dir")) {
        await handleDirectionCallback(bot, callbackQuery);
    } else if (data === "notify_save") {
        await handleSaveCallback(bot, callbackQuery);
    } else if (data === "notify_cancel") {
        await handleCancelCallback(bot, callbackQuery);
    } else if (data === "notify_list") {
        await handleListCallback(bot, callbackQuery);
    } else if (data === "notify_remove_menu") {
        await handleRemoveMenuCallback(bot, callbackQuery);
    } else if (data.startsWith("group_setup")) {
        await handleGroupSetupCallback(bot, callbackQuery);
    } else if (data === "notify_cancel_group") {
        await handleCancelGroupCallback(bot, callbackQuery);
    }
};

/**
 * Handle "List Mints" callback
 */
const handleListCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const alerts = getAlertsByChat(String(chatId));

    try {
        if (alerts.length > 0) {
            const { buildAlertListKeyboard } = require("./utils");
            const keyboard = await buildAlertListKeyboard(alerts);

            await bot.editMessageText("Your active alerts:", {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: keyboard,
            });
        } else {
            const { buildMainMenuKeyboard } = require("./utils");
            await bot.editMessageText("You don't have any alerts yet.", {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: buildMainMenuKeyboard(),
            });
        }
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleListCallback:", error);
        }
    }
    bot.answerCallbackQuery(callbackQuery.id);
};

/**
 * Handle "Remove Mint" Menu callback
 * Shows list of mints to remove (same as list but maybe different text/action in future, for now reusing list view which has delete options)
 */
const handleRemoveMenuCallback = async (bot, callbackQuery) => {
    // For now, just show the list which has delete options
    await handleListCallback(bot, callbackQuery);
};

/**
 * Handle Group Setup Callback (UP/DOWN selection)
 */
const handleGroupSetupCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const [, tokenAddress, direction] = callbackQuery.data.split("|");

    // Create the alert immediately for the group
    const result = createAlert(
        String(chatId),
        tokenAddress,
        msg.message_id,
        direction,
        10 // Default threshold
    );

    try {
        if (result.changes === 0) {
            await bot.editMessageText(`This group is already tracking ${tokenAddress}.`, {
                chat_id: chatId,
                message_id: msg.message_id,
            });
        } else {
            const { buildAlertCreatedMessage } = require("./utils");
            await bot.editMessageText(
                `✅ Group Alert Configured!\n\nToken: ${tokenAddress}\nDirection: ${direction.toUpperCase()}\nThreshold: 10%\n\nNotifications will be sent to this group.`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id
                }
            );
        }
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleGroupSetupCallback:", error);
        }
    }
    bot.answerCallbackQuery(callbackQuery.id, { text: "Group alert configured!" });
};

/**
 * Handle Group Setup Cancel
 */
const handleCancelGroupCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    try {
        await bot.editMessageText("Group configuration cancelled.", {
            chat_id: chatId,
            message_id: msg.message_id
        });
    } catch (error) {
        if (!error.message?.includes("message is not modified")) {
            console.error("Error in handleCancelGroupCallback:", error);
        }
    }
    bot.answerCallbackQuery(callbackQuery.id);
};

module.exports = {
    handleCallback
};
