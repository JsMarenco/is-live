const { findTokensByChat } = require("../db");

const handleCa = async (bot, msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    if (chatType !== "group" && chatType !== "supergroup") {
        return bot.sendMessage(chatId, "This command only works in groups.");
    }

    const tokens = findTokensByChat.all(String(chatId));

    if (!tokens || tokens.length === 0) {
        return bot.sendMessage(chatId, "No token setup for this group. Use /setup <token_address> to set one.");
    }

    const tokenAddress = tokens[0].token_address;
    bot.sendMessage(chatId, tokenAddress);
};

module.exports = {
    regex: /^\/ca(?:@[\w_]+)?$/i,
    handler: handleCa,
};
