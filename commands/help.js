const handleHelp = (bot, msg) => {
    const helpText =
        "$ITSLIVE Livestream Bot commands:\n" +
        "/setup <tokenAddress> - Subscribe to a token\n"+ 
        "/ca - Send the contract address\n"
    // '/list - Show your current subscriptions';
    bot.sendMessage(msg.chat.id, helpText);
};

module.exports = {
    regex: /^\/help(?:@[\w_]+)?$/,
    handler: handleHelp,
};
