# TempMail Telegram Bot — Production Guide

## What this bot does
The TempMail Telegram Bot provides disposable email addresses through Telegram. Each user gets a unique Guerrilla Mail inbox, can generate new addresses, and read recent messages directly from the chat interface. The bot stores only a session token and the current address per user. 

## User flow
1. User sends `/start` to initialize a disposable inbox.
2. Bot returns the current email address.
3. User shares the address externally.
4. User sends `/inbox` to list latest messages.
5. User sends `/message <id>` to read a specific email.
6. User can send `/new` to generate a fresh inbox or `/reset` to clear state.

## Command list
- `/start` — Initialize your disposable inbox and show your current address.
- `/help` — Show the list of commands.
- `/address` — Show the current address without regenerating.
- `/new` — Generate a new disposable address.
- `/inbox` — List recent inbox messages (up to 5).
- `/message <id>` — Fetch a specific email by its ID.
- `/reset` — Clear your stored session data.

## Project structure
```
bot/
├── src/
│   ├── config.js          # Environment configuration
│   ├── index.js           # Bot entry point
│   ├── logger.js          # Structured logging helper
│   ├── handlers/
│   │   └── commands.js    # Command handlers
│   ├── services/
│   │   └── guerrillaMail.js # Guerrilla Mail API wrapper
│   └── storage/
│       └── userStore.js   # JSON-backed storage for user sessions
├── data/                  # Runtime storage folder (JSON file created at runtime)
├── .env.example           # Environment variables template
└── package.json           # Bot dependencies and scripts
```

## Setup guide
### 1) Create a Telegram bot
1. Open Telegram and start a chat with **@BotFather**.
2. Run `/newbot` and follow the prompts.
3. Copy the bot token you receive.

### 2) Configure environment variables
1. Copy the example file:
   ```bash
   cp bot/.env.example bot/.env
   ```
2. Set `TELEGRAM_BOT_TOKEN` in `bot/.env`.
3. (Optional) Set `BOT_ALLOWED_USERS` to a comma-separated list of Telegram user IDs for access control.

### 3) Install dependencies
```bash
cd bot
npm install
```

### 4) Run locally
```bash
npm start
```

## Deployment guide
### VPS deployment (systemd)
1. Provision a VPS with Node.js 18+.
2. Clone the repository and install dependencies in `bot/`.
3. Create a systemd service at `/etc/systemd/system/temp-mail-bot.service`:
   ```ini
   [Unit]
   Description=TempMail Telegram Bot
   After=network.target

   [Service]
   WorkingDirectory=/opt/temp-mail/bot
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   EnvironmentFile=/opt/temp-mail/bot/.env
   User=botuser

   [Install]
   WantedBy=multi-user.target
   ```
4. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable temp-mail-bot
   sudo systemctl start temp-mail-bot
   ```

### Docker (optional)
If you prefer Docker, create a container that runs `npm start` in the `bot/` directory with a mounted `.env` file and persistent volume for `bot/data`.

## How to extend
- Add new commands in `bot/src/handlers/commands.js`.
- Register them in `bot/src/index.js`.
- Place external integrations in `bot/src/services/`.
- For new storage needs, extend `bot/src/storage/userStore.js` or replace it with a database-backed implementation.

## Common issues & troubleshooting
- **Bot replies “Access denied.”**
  - `BOT_ALLOWED_USERS` is set and your user ID is not in the list.
- **No messages appear in `/inbox`**
  - Guerrilla Mail inboxes expire quickly; generate a new address with `/new`.
- **Timeout errors**
  - Increase `REQUEST_TIMEOUT_MS` or check network connectivity.
- **Bot crashes on startup**
  - Ensure `TELEGRAM_BOT_TOKEN` is set and valid.
