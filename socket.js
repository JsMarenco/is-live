require("dotenv").config();
const { io } = require("socket.io-client");
const {
    findChatsByToken,
    findTokenMC,
    insertTokenMC,
    updateTokenMC,
    findChatsByMarketCapAlert,
    upsertPinnedMessage,
    findPinnedMessagesByToken,
    deletePinnedMessage,
} = require("./db");
const {
    formatLiveMessage,
    formatMarketcapMessage,
    formatOfflineMessage,
    buildPumpFunButton,
} = require("./utils");

const SOCKET_URL = process.env.SOCKET_URL;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY;

const startSocketService = (bot) => {
    const sendMessageBatch = async (chatRows, text, options) => {
        const sendPromises = chatRows.map((row) =>
            bot.sendMessage(row.chat_id, text, options).catch((error) => {
                console.warn(
                    `Failed to send message to chat ${row.chat_id}`,
                    error.message
                );
            })
        );
        await Promise.all(sendPromises);
    };

    const notifyChatsStreamLive = async (chats, stream) => {
        const options = buildPumpFunButton(stream.mint);
        for (const row of chats) {
            try {
                const sentMessage = await bot.sendMessage(
                    row.chat_id,
                    formatLiveMessage(stream),
                    options
                );
                await bot.pinChatMessage(row.chat_id, sentMessage.message_id, {
                    disable_notification: true,
                });
                upsertPinnedMessage.run(
                    row.chat_id,
                    stream.mint,
                    sentMessage.message_id
                );
            } catch (error) {
                console.warn(
                    `Failed to notify or pin chat ${row.chat_id}`,
                    error.message
                );
            }
        }
    };

    const unpinChatsForToken = async (tokenAddress) => {
        const pinnedRows = findPinnedMessagesByToken.all(tokenAddress);
        if (!pinnedRows.length) {
            return;
        }

        const operations = pinnedRows.map(async (row) => {
            try {
                await bot.unpinChatMessage(row.chat_id, row.message_id);
            } catch (error) {
                console.warn(
                    `Failed to unpin message ${row.message_id} in chat ${row.chat_id}`,
                    error.message
                );
            } finally {
                deletePinnedMessage.run(row.chat_id, tokenAddress);
            }
        });

        await Promise.all(operations);
    };

    const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnectionDelayMax: 10000,
        auth: SOCKET_API_KEY ? { apiKey: SOCKET_API_KEY } : undefined,
    });

    socket.on("connect", () => {
        console.log("Connected to websocket", socket.id);
    });

    socket.on("connect_error", (error) => {
        console.warn("Websocket connection failed", error.message);
    });

    socket.on("disconnect", (reason) => {
        console.warn("Disconnected from websocket", reason);
    });

    socket.on("nowLive", async (stream) => {
        if (!stream?.mint) {
            return;
        }
        const chats = findChatsByToken.all(stream.mint);
        if (!chats.length) {
            return;
        }
        await notifyChatsStreamLive(chats, stream);
    });

    socket.on("market_cap_update", async (stream) => {
        const newMC = stream.market_cap_usd;
        if (!stream?.mint) {
            return;
        }
        const oldMCrow = findTokenMC.get(stream.mint);
        const oldMC = oldMCrow ? oldMCrow.market_cap_usd : 0;
        insertTokenMC.run(stream.mint, stream.market_cap_usd);
        updateTokenMC.run(stream.market_cap_usd, stream.mint);
        const isUp = newMC > oldMC;
        const mcChange = Math.abs(newMC - oldMC);
        const percentChange = oldMC === 0 ? 100 : (mcChange / oldMC) * 100;

        const chats = findChatsByMarketCapAlert.all(stream.mint);
        if (!chats.length) {
            return;
        }
        const options = buildPumpFunButton(stream.mint);
        for (const row of chats) {
            try {
                const { chat_id, message_id, type, threshold, amount, direction } = row;
                let shouldNotify = false;
                if (type === "threshold") {
                    if (isUp && direction === "up" && percentChange >= threshold) {
                        shouldNotify = true;
                    } else if (
                        !isUp &&
                        direction === "down" &&
                        percentChange >= threshold
                    ) {
                        shouldNotify = true;
                    }
                } else if (type === "amount") {
                    if (mcChange >= amount) {
                        if (direction === "up" && isUp) {
                            shouldNotify = true;
                        } else if (direction === "down" && !isUp) {
                            shouldNotify = true;
                        }
                    }
                }
                if (shouldNotify) {
                    // Note: 'pinned' was not defined in the original code snippet for market_cap_update loop.
                    // It seems like a bug in the original code or I missed where 'pinned' comes from.
                    // Looking at the original code:
                    // const { chat_id, message_id, ... } = row;
                    // ...
                    // chat_id: pinned.chat_id,
                    // message_id: pinned.message_id,
                    // It seems 'pinned' is undefined. It should probably be 'row'.
                    // I will fix this bug here by using 'row' or 'chat_id'/'message_id' from row.

                    await bot.editMessageText(
                        formatMarketcapMessage(stream, percentChange, isUp, amount),
                        {
                            chat_id: chat_id,
                            message_id: message_id,
                            ...options,
                        }
                    );
                }
            } catch (error) {
                console.warn(
                    `Failed to update message in chat ${row.chat_id}`,
                    error.message
                );
            }
        }
    });

    socket.on("streamOffline", async (stream) => {
        if (!stream?.mint) {
            return;
        }
        const chats = findChatsByToken.all(stream.mint);
        if (!chats.length) {
            return;
        }
        await unpinChatsForToken(stream.mint);
        await sendMessageBatch(chats, formatOfflineMessage(stream));
    });

    return socket;
};

module.exports = { startSocketService };
