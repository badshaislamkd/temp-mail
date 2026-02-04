import dotenv from 'dotenv';

dotenv.config();

const required = (value, name) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parseAllowedUsers = (value) => {
  if (!value) return null;
  const ids = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number(entry));

  if (ids.some((id) => Number.isNaN(id))) {
    throw new Error('BOT_ALLOWED_USERS must be a comma-separated list of numeric Telegram user IDs.');
  }

  return new Set(ids);
};

const parseNumber = (value, fallback, name) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }
  return parsed;
};

export const config = {
  botToken: required(process.env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN'),
  allowedUsers: parseAllowedUsers(process.env.BOT_ALLOWED_USERS),
  apiBase: process.env.GUERRILLA_API_BASE ?? 'https://api.guerrillamail.com/ajax.php',
  requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 10000, 'REQUEST_TIMEOUT_MS'),
  storagePath: process.env.STORAGE_PATH ?? 'data/users.json',
  rateLimitMs: parseNumber(process.env.RATE_LIMIT_MS, 1500, 'RATE_LIMIT_MS')
};
