import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';
import { commandHandlers } from './handlers/commands.js';

const bot = new Telegraf(config.botToken);

const lastAction = new Map();

bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  if (config.allowedUsers && !config.allowedUsers.has(ctx.from.id)) {
    await ctx.reply('Access denied.');
    logger.warn('Unauthorized access attempt', { userId: ctx.from.id });
    return;
  }

  const now = Date.now();
  const last = lastAction.get(ctx.from.id) ?? 0;
  if (now - last < config.rateLimitMs) {
    await ctx.reply('You are sending requests too fast. Please slow down.');
    return;
  }

  lastAction.set(ctx.from.id, now);
  await next();
});

bot.start(commandHandlers.start);
bot.command('help', commandHandlers.help);
bot.command('address', commandHandlers.address);
bot.command('new', commandHandlers.newAddress);
bot.command('inbox', commandHandlers.inbox);
bot.command('message', commandHandlers.message);
bot.command('reset', commandHandlers.reset);

bot.on('text', async (ctx) => {
  await ctx.reply('Unrecognized command. Send /help to see available commands.');
});

bot.catch((error, ctx) => {
  logger.error('Bot error', { error: error.message, updateId: ctx.update?.update_id });
});

bot.launch().then(() => {
  logger.info('Telegram bot started');
});

const shutdown = async (signal) => {
  logger.info('Shutting down bot', { signal });
  await bot.stop(signal);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
