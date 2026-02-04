import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const resolvePath = () => path.resolve(process.cwd(), config.storagePath);

const ensureFile = async () => {
  const filePath = resolvePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ users: {} }, null, 2));
  }
};

const readData = async () => {
  await ensureFile();
  const raw = await fs.readFile(resolvePath(), 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    logger.error('Failed to parse storage file. Resetting to empty store.', { error: error.message });
    const empty = { users: {} };
    await writeData(empty);
    return empty;
  }
};

const writeData = async (data) => {
  const filePath = resolvePath();
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, filePath);
};

let writeLock = Promise.resolve();
const withWriteLock = (operation) => {
  const next = writeLock.then(operation, operation);
  writeLock = next.catch(() => {});
  return next;
};

export const userStore = {
  async getUser(userId) {
    const data = await readData();
    return data.users[userId] ?? null;
  },
  async setUser(userId, payload) {
    return withWriteLock(async () => {
      const data = await readData();
      data.users[userId] = {
        ...data.users[userId],
        ...payload,
        updatedAt: new Date().toISOString()
      };
      await writeData(data);
      logger.info('User state updated', { userId });
      return data.users[userId];
    });
  },
  async clearUser(userId) {
    return withWriteLock(async () => {
      const data = await readData();
      delete data.users[userId];
      await writeData(data);
      logger.info('User state cleared', { userId });
    });
  }
};
