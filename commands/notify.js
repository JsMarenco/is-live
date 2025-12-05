const { insertMarketCapAlert } = require("../db");

const showNotifyMarketCapMenu = (bot, chatId, tokenAddress) => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Alert me when market cap increases by 10%",
                        callback_data: `mc_alert|threshold|10|up`,
                    },
                ],
                [
                    {
                        text: "Alert me when market cap decreases by 10%",
                        callback_data: `mc_alert|threshold|10|down`,
                    },
                ],
                [
                    {
                        text: "Delete this alert",
                        callback_data: `mc_alert|delete|0|none`,
                    },
                ],
            ],
        },
    };

    bot.sendMessage(
        chatId,
        `Set market cap alerts for token: ${tokenAddress}`,
        options
    );
};

const handleNotify = (bot, msg) => {
    const chatId = msg.chat.id;
    const address = msg.text.split(" ")[1];

    if (!address) {
        bot.sendMessage(chatId, "Please provide a token address.");
        return;
    }

    showNotifyMarketCapMenu(bot, chatId, address);
};

const handleCallback = async (bot, callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith("mc_alert")) {
        const [, type, value, direction] = data.split("|");
        const messageId = msg.message_id;
        const tokenAddress = msg.text.match(/token:\s+(\S+)/)[1];

        const result = insertMarketCapAlert.run(
            String(chatId),
            tokenAddress,
            messageId,
            type,
            type === "threshold" ? parseInt(value, 10) : 0,
            type === "amount" ? parseInt(value, 10) : 0,
            direction
        );

        if (result.changes === 0) {
            bot.answerCallbackQuery(callbackQuery.id, {
                text: `You already have a market cap alert set for ${tokenAddress}.`,
            });
        }

        bot.answerCallbackQuery(callbackQuery.id, {
            text: `Market cap alert set for ${tokenAddress}!`,
        });
    }
};

module.exports = {
    regex: /^\/notify(?:@[\w_]+)?\s+(\S+)/i,
    handler: handleNotify,
    handleCallback,
};
