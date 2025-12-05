const normalizeMint = (raw) => raw.replace(/\s+/g, "").trim();
const isValidMint = (mint) => /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(mint);

const formatStreamLabel = (stream) => {
    const label = stream.name || stream.symbol || "Unnamed token";
    return `${label}`;
};

const formatLiveMessage = (stream) => {
    const title = stream.livestream_title
        ? `\n\n🎬 ${stream.livestream_title}`
        : "";
    const viewers =
        typeof stream.viewers === "number"
            ? `\n👀 Viewers: ${stream.viewers} \n💰Market Cap: ${stream.market_cap_usd}\n👤Holders: ${stream.holders}`
            : "";
    return `🟢 ${formatStreamLabel(stream)} is LIVE!${title}${viewers}🚀`;
};

const fetchCoinData = async (mint) => {
    try {
        const response = await fetch(`https://data.pumpmod.live/coin/${mint}`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch coin data:", error);
        return null;
    }
};

const formatMarketcapMessage = (stream) => {
    return `📈 ${formatStreamLabel(
        stream
    )} market cap updated: $${stream.market_cap_usd.toLocaleString()}`;
};

const formatOfflineMessage = (stream) =>
    `🔴 ${formatStreamLabel(stream)} went offline.`;

const buildPumpFunButton = (mint) => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Open on Pumpfun", url: `https://pump.fun/coin/${mint}` }],
        ],
    },
});

const formatTokenDisplay = async (tokenAddress) => {
    const coinData = await fetchCoinData(tokenAddress);

    if (coinData && (coinData.name || coinData.symbol)) {
        const name = coinData.name || coinData.symbol;
        const symbol = coinData.symbol ? `(${coinData.symbol})` : "";
        return `${name} ${symbol}`.trim();
    }

    // Fallback to shortened address if no data
    return `${tokenAddress.substring(0, 4)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
};

module.exports = {
    normalizeMint,
    isValidMint,
    formatStreamLabel,
    formatLiveMessage,
    fetchCoinData,
    formatMarketcapMessage,
    formatOfflineMessage,
    buildPumpFunButton,
    formatTokenDisplay,
};
