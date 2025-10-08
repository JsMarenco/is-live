<p align="center">
  <strong>$IsLive</strong>
  <img src="https://is-live.uk/logo.png" alt="$IsLive Token" width="400">
  <br>
</p>

# $Islive

$ISLIVE keeps you updated on PumpFun livestreams. Add a coin and receive Telegram notifications the moment it goes live (Discord and Slack coming soon).

## Features

- Subscribe to token notifications using a command
- Fetch token details from the Pump.fun API
- Store subscriptions locally in a JSON file
- Automatically notify users when a token goes live
- Handles multiple users and tokens

## Requirements

- Node.js (v18 or later)
- A Telegram Bot Token from [BotFather](https://t.me/BotFather)
- Bun

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jsmarenco/is-live.git
   cd is-live
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file in the project root with your Telegram bot token:

   ```bash
   TELEGRAM_TOKEN_BOT=your_bot_token_here
   ```

4. Run the bot:

   ```bash
   bun run dev
   ```

## Usage

- Start a chat with your bot on Telegram.
- Subscribe to a token by sending the command:

  ```
  /notify <token_address>
  ```

  Example:

  ```
  /notify 9xKQ4L3pump
  ```

  The bot will confirm your subscription and notify you once the token goes live.

## Project Structure

```
.
├── tokens/
│   └── db.json          # Local storage for token subscriptions
├── index.ts             # Main bot logic
├── package.json
└── README.md
```

## How It Works

1. Users send `/notify <token>` to the bot.
2. The bot retrieves token data from the Pump.fun API.
3. User subscriptions are saved in `tokens/db.json`.
4. Every minute, the bot checks if any subscribed token is live.
5. If a token goes live, the bot sends a notification to all subscribers.

## Notes

- Token data is fetched from the Pump.fun public API endpoint:

  ```
  https://frontend-api-v3.pump.fun/coins/<token_address>
  ```

- The JSON database is stored locally in the `tokens` folder.

## License

MIT License
