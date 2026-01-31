import { guerrillaMail } from '../services/guerrillaMail.js';
import { userStore } from '../storage/userStore.js';
import { logger } from '../logger.js';

const domains = ['guerrillamail.com', 'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.org'];

const createAddress = async () => {
  const session = await guerrillaMail.createSession();
  const emailUser = Math.random().toString(36).slice(2, 8);
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const response = await guerrillaMail.setEmailUser({
    sidToken: session.sid_token,
    emailUser,
    domain
  });

  return {
    sidToken: response.sid_token ?? session.sid_token,
    email: response.email_addr
  };
};

const formatInbox = (list = []) => {
  if (!list.length) {
    return 'Your inbox is empty right now.';
  }

  const items = list.slice(0, 5).map((email) => {
    return `• [${email.mail_id}] ${email.mail_from} — ${email.mail_subject || '(no subject)'}`;
  });

  return `Latest messages:\n${items.join('\n')}`;
};

export const commandHandlers = {
  start: async (ctx) => {
    const userId = ctx.from.id;
    try {
      let user = await userStore.getUser(userId);

      if (!user) {
        const address = await createAddress();
        user = await userStore.setUser(userId, address);
      }

      await ctx.reply(`Welcome! Your disposable email address is:\n${user.email}\n\nUse /inbox to list recent emails or /new to generate a fresh address.`);
    } catch (error) {
      logger.error('Failed to initialize user', { error: error.message, userId });
      await ctx.reply('Unable to create an inbox right now. Please try again later.');
    }
  },
  help: async (ctx) => {
    await ctx.reply([
      'Available commands:',
      '/start - Initialize your disposable inbox',
      '/address - Show current email address',
      '/new - Generate a new email address',
      '/inbox - List latest messages',
      '/message <id> - Read a message by ID',
      '/reset - Clear your stored session'
    ].join('\n'));
  },
  address: async (ctx) => {
    const user = await userStore.getUser(ctx.from.id);
    if (!user) {
      await ctx.reply('No address yet. Send /start to initialize.');
      return;
    }
    await ctx.reply(`Your current disposable email address is:\n${user.email}`);
  },
  newAddress: async (ctx) => {
    const userId = ctx.from.id;
    try {
      const address = await createAddress();
      await userStore.setUser(userId, address);
      await ctx.reply(`New address created:\n${address.email}`);
    } catch (error) {
      logger.error('Failed to generate new address', { error: error.message, userId });
      await ctx.reply('Unable to generate a new inbox right now. Please try again later.');
    }
  },
  inbox: async (ctx) => {
    const user = await userStore.getUser(ctx.from.id);
    if (!user) {
      await ctx.reply('No address yet. Send /start to initialize.');
      return;
    }

    try {
      const data = await guerrillaMail.listEmails({ sidToken: user.sidToken });
      await ctx.reply(formatInbox(data.list));
    } catch (error) {
      logger.error('Inbox fetch failed', { error: error.message, userId: ctx.from.id });
      await ctx.reply('Unable to fetch inbox right now. Please try again later.');
    }
  },
  message: async (ctx) => {
    const user = await userStore.getUser(ctx.from.id);
    if (!user) {
      await ctx.reply('No address yet. Send /start to initialize.');
      return;
    }

    const [, emailIdRaw] = ctx.message.text.split(' ');
    const emailId = Number(emailIdRaw);
    if (!emailIdRaw || Number.isNaN(emailId)) {
      await ctx.reply('Usage: /message <id> (use /inbox to see IDs)');
      return;
    }

    try {
      const data = await guerrillaMail.fetchEmail({ sidToken: user.sidToken, emailId });
      const subject = data.mail_subject || '(no subject)';
      const from = data.mail_from || 'Unknown sender';
      const body = data.mail_body || data.mail_excerpt || '(empty message)';
      await ctx.reply(`From: ${from}\nSubject: ${subject}\n\n${body}`);
    } catch (error) {
      logger.error('Message fetch failed', { error: error.message, userId: ctx.from.id, emailId });
      await ctx.reply('Unable to fetch that message. It might have expired.');
    }
  },
  reset: async (ctx) => {
    await userStore.clearUser(ctx.from.id);
    await ctx.reply('Your session has been cleared. Send /start to create a new inbox.');
  }
};
