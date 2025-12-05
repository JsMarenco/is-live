const { insertMarketCapAlert, findAlertsByChat, deleteMarketCapAlert, findTokensByChat } = require("../db");
const { isValidMint, normalizeMint, formatTokenDisplay } = require("../utils");

// Store temporary alert data (token + direction) before saving
const pendingAlerts = new Map();

const handleNotify = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isPrivate = msg.chat.type === "private";
    const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";

    // Check permissions in groups
    if (isGroup) {
        try {
            const chatMember = await bot.getChatMember(chatId, userId);
            const isAdmin = ["creator", "administrator"].includes(chatMember.status);

            if (!isAdmin) {
                bot.sendMessage(
                    chatId,
                    "Only admins and the owner can use this command in groups."
                );
                return;
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            bot.sendMessage(chatId, "Error checking permissions. Please try again.");
            return;
        }

        // Get the group's configured token
        const groupTokens = findTokensByChat.all(String(chatId));

        if (groupTokens.length === 0) {
            bot.sendMessage(
                chatId,
                "This group hasn't been set up yet. Please use /setup <tokenAddress> first."
            );
            return;
        }

        const groupToken = groupTokens[0].token_address;
        const tokenDisplay = await formatTokenDisplay(groupToken);

        // Show alert configuration directly for the group's token
        const pendingKey = `${userId}`;
        pendingAlerts.set(pendingKey, {
            token: groupToken,
            direction: "up",
            threshold: 10,
            forGroup: chatId
        });

        bot.sendMessage(
            chatId,
            `Configuring alert for ${tokenDisplay}\n\n@${msg.from.username || msg.from.first_name}, check your private messages.`
        );

        try {
            await bot.sendMessage(
                userId,
                `Configuring alert for group: ${msg.chat.title}\nToken: ${tokenDisplay}\nDirection: UP\nThreshold: 10%\n\nSelect direction and save:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "📈 UP", callback_data: `notify_dir|up` },
                                { text: "📉 DOWN", callback_data: `notify_dir|down` },
                            ],
                            [{ text: "💾 Save Alert", callback_data: `notify_save` }],
                            [{ text: "❌ Cancel", callback_data: `notify_cancel` }],
                        ],
                    },
                }
            );
        } catch (error) {
            bot.sendMessage(
                chatId,
                `@${msg.from.username || msg.from.first_name}, please start a private chat with me first by clicking: @${(await bot.getMe()).username}`
            );
        }
        return;
    }

    // Private chat flow (unchanged)
    const alerts = findAlertsByChat.all(String(chatId));

    if (alerts.length > 0) {
        // Fetch token names for all alerts
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

        bot.sendMessage(chatId, "Your alerts:", {
            reply_markup: {
                inline_keyboard: alertButtons,
            },
        });
    } else {
        bot.sendMessage(
            chatId,
            "You don't have any alerts yet. Please enter a token address to create one:",
            {
                reply_markup: {
                    force_reply: true,
                },
            }
        );
    }
};

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
    const existingAlerts = findAlertsByChat.all(String(chatId));
    console.log("Existing alerts:", existingAlerts);
    const hasAlert = existingAlerts.some(
        (alert) => alert.token_address === normalized
    );

    if (hasAlert) {
        console.log("Alert already exists for:", normalized);
        bot.sendMessage(
            chatId,
            `You already have an alert for this token: ${normalized}`
        );
        return;
    }

    // Store pending alert with default direction
    const pendingKey = `${chatId}`;
    pendingAlerts.set(pendingKey, { token: normalized, direction: "up" });

    console.log("Sending direction selection interface");
    bot.sendMessage(
        chatId,
        `Token: ${normalized}\nDirection: UP\nThreshold: 10%\n\nSelect direction and click Save:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📈 UP", callback_data: `notify_dir|up` },
                        { text: "📉 DOWN", callback_data: `notify_dir|down` },
                    ],
                    [{ text: "💾 Save Alert", callback_data: `notify_save` }],
                    [{ text: "❌ Cancel", callback_data: `notify_cancel` }],
                ],
            },
        }
    );
};

const handleCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;
    const pendingKey = `${chatId}`;

    if (data === "notify_create") {
        await bot.editMessageText("Please enter the token address for your new alert:", {
            chat_id: chatId,
            message_id: msg.message_id,
        });

        await bot.sendMessage(chatId, "Enter token address:", {
            reply_markup: {
                force_reply: true,
            },
        });

        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data.startsWith("notify_view")) {
        const tokenAddress = data.split("|")[1];
        const alerts = findAlertsByChat.all(String(chatId));
        const alert = alerts.find((a) => a.token_address === tokenAddress);

        if (alert) {
            const tokenDisplay = await formatTokenDisplay(tokenAddress);

            await bot.editMessageText(
                `Token: ${tokenDisplay}\nAddress: ${tokenAddress}\nDirection: ${alert.direction.toUpperCase()}\nThreshold: ${alert.threshold}%\n\nEdit direction or delete:`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: alert.direction === "up" ? "✅ UP" : "📈 UP",
                                    callback_data: `notify_edit|${tokenAddress}|up`
                                },
                                {
                                    text: alert.direction === "down" ? "✅ DOWN" : "📉 DOWN",
                                    callback_data: `notify_edit|${tokenAddress}|down`
                                },
                            ],
                            [{ text: "🗑️ Delete Alert", callback_data: `notify_delete|${tokenAddress}` }],
                            [{ text: "⬅️ Back", callback_data: "notify_back" }],
                        ],
                    },
                }
            );
        }

        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data.startsWith("notify_edit")) {
        const [, tokenAddress, newDirection] = data.split("|");

        // Delete old alert
        deleteMarketCapAlert.run(String(chatId), tokenAddress, "threshold");

        // Create new alert with updated direction
        const result = insertMarketCapAlert.run(
            String(chatId),
            tokenAddress,
            msg.message_id,
            "threshold",
            10,
            0,
            newDirection
        );

        if (result.changes > 0) {
            const tokenDisplay = await formatTokenDisplay(tokenAddress);

            await bot.editMessageText(
                `Token: ${tokenDisplay}\nAddress: ${tokenAddress}\nDirection: ${newDirection.toUpperCase()}\nThreshold: 10%\n\nEdit direction or delete:`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: newDirection === "up" ? "✅ UP" : "📈 UP",
                                    callback_data: `notify_edit|${tokenAddress}|up`
                                },
                                {
                                    text: newDirection === "down" ? "✅ DOWN" : "📉 DOWN",
                                    callback_data: `notify_edit|${tokenAddress}|down`
                                },
                            ],
                            [{ text: "🗑️ Delete Alert", callback_data: `notify_delete|${tokenAddress}` }],
                            [{ text: "⬅️ Back", callback_data: "notify_back" }],
                        ],
                    },
                }
            );

            bot.answerCallbackQuery(callbackQuery.id, { text: `Updated to ${newDirection.toUpperCase()}!` });
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Failed to update alert." });
        }

        return;
    }

    if (data.startsWith("notify_delete")) {
        const tokenAddress = data.split("|")[1];

        deleteMarketCapAlert.run(String(chatId), tokenAddress, "threshold");

        await bot.editMessageText(`Alert for ${tokenAddress} deleted.`, {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [[{ text: "⬅️ Back to Alerts", callback_data: "notify_back" }]],
            },
        });

        bot.answerCallbackQuery(callbackQuery.id, { text: "Alert deleted!" });
        return;
    }

    if (data === "notify_back") {
        const alerts = findAlertsByChat.all(String(chatId));

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
        return;
    }

    if (data.startsWith("notify_dir")) {
        const direction = data.split("|")[1];
        const pending = pendingAlerts.get(pendingKey);

        if (!pending) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please start over." });
            return;
        }

        pending.direction = direction;
        pendingAlerts.set(pendingKey, pending);

        await bot.editMessageText(
            `Token: ${pending.token}\nDirection: ${direction.toUpperCase()}\nThreshold: 10%\n\nSelect direction and click Save:`,
            {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: direction === "up" ? "✅ UP" : "📈 UP", callback_data: `notify_dir|up` },
                            { text: direction === "down" ? "✅ DOWN" : "📉 DOWN", callback_data: `notify_dir|down` },
                        ],
                        [{ text: "💾 Save Alert", callback_data: `notify_save` }],
                        [{ text: "❌ Cancel", callback_data: `notify_cancel` }],
                    ],
                },
            }
        );

        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data === "notify_save") {
        const pending = pendingAlerts.get(pendingKey);

        if (!pending) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please start over." });
            return;
        }

        const result = insertMarketCapAlert.run(
            String(chatId),
            pending.token,
            msg.message_id,
            "threshold",
            10,
            0,
            pending.direction
        );

        console.log("Insert result:", result);

        if (result.changes === 0) {
            await bot.editMessageText(`You already have an alert set for ${pending.token}.`, {
                chat_id: chatId,
                message_id: msg.message_id,
            });
        } else {
            await bot.editMessageText(
                `✅ Alert created!\n\nToken: ${pending.token}\nDirection: ${pending.direction.toUpperCase()}\nThreshold: 10%`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[{ text: "⬅️ Back to Alerts", callback_data: "notify_back" }]],
                    },
                }
            );
        }

        pendingAlerts.delete(pendingKey);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Alert saved!" });
        return;
    }

    if (data === "notify_cancel") {
        pendingAlerts.delete(pendingKey);

        await bot.editMessageText("Alert creation cancelled.", {
            chat_id: chatId,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [[{ text: "⬅️ Back to Alerts", callback_data: "notify_back" }]],
            },
        });

        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }
};

module.exports = {
    regex: /^\/notify(?:@[\w_]+)?$/,
    handler: handleNotify,
    handleReply,
    handleCallback,
};
