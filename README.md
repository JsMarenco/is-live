# $ITSLIVE
## CA: 9jhRJYAPw1duTaU5yj4Z2zJm2BUpNQLUYEn4uktppump

A Telegram bot that provides real-time notifications for PumpFun livestreams and market cap updates.

## Features

- Subscribe to specific tokens to receive alerts when they go live.
- Real-time updates using Websockets.
- Automatic pinning of live stream messages in Telegram chats.
- Market cap tracking and alerts based on thresholds or absolute amounts.
- SQLite database for storing subscriptions and alerts.
- Unpins messages automatically when a stream goes offline.

## Prerequisites

- Node.js
- A Telegram Bot Token
- A Socket URL and API Key for the data source

## Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a .env file with the following variables:

   ```env
   TELEGRAM_BOT_TOKEN=your_token_here
   SOCKET_URL=your_socket_url
   SOCKET_API_KEY=your_socket_api_key
   DB_PATH=subscriptions.db
   ```

## Usage

Start the bot:

```bash
bun run index.ts
```

### Commands

- /setup <tokenAddress> - Subscribe to a token to receive live stream and market cap notifications.
- /help - Show available commands.

## Database

The bot uses SQLite to store:
- Subscriptions (chat_id, token_address)
- Pinned messages
- Market cap alerts
- Token market cap history
