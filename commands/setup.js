const { insertSubscription } = require("../db");
const { normalizeMint, isValidMint, fetchCoinData } = require("../utils");

const subscribeToToken = async (chatId, tokenAddress) => {
    const normalized = normalizeMint(tokenAddress);

    if (!isValidMint(normalized)) {
        return {
            ok: false,
            message: "Please provide a valid Solana token address.",
        };
    }

    const result = insertSubscription.run(String(chatId), normalized);
    if (result.changes === 0) {
        return { ok: true, message: "You are already subscribed to this token." };
    }
    const coinData = await fetchCoinData(tokenAddress);
    return {
        ok: true,
        message: `Subscribed! You will be notified when ${coinData?.name || normalized
            } goes live or offline.`,
    };
};

const handleSetup = async (bot, msg, match) => {
    const chatId = msg.chat.id;
    const tokenAddress = match?.[1] || "";
    const response = await subscribeToToken(chatId, tokenAddress);
    bot.sendMessage(chatId, response.message);
};

module.exports = {
    regex: /^\/setup(?:@[\w_]+)?\s+(\S+)/i,
    handler: handleSetup,
};
