import { config } from '../config.js';

const withTimeout = async (promise, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const request = async (path, params = {}, method = 'GET') => {
  const url = new URL(config.apiBase);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return withTimeout(async (signal) => {
    const response = await fetch(url.toString(), {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: method === 'POST' ? new URLSearchParams(params).toString() : undefined,
      signal
    });

    if (!response.ok) {
      throw new Error(`Guerrilla Mail API error: ${response.status}`);
    }

    return response.json();
  }, config.requestTimeoutMs);
};

export const guerrillaMail = {
  async createSession() {
    return request('', { f: 'get_email_address' });
  },
  async setEmailUser({ sidToken, emailUser, domain }) {
    return request('', {
      f: 'set_email_user',
      sid_token: sidToken,
      email_user: emailUser,
      domain
    }, 'POST');
  },
  async listEmails({ sidToken, offset = 0 }) {
    return request('', { f: 'get_email_list', sid_token: sidToken, offset });
  },
  async fetchEmail({ sidToken, emailId }) {
    return request('', { f: 'fetch_email', sid_token: sidToken, email_id: emailId });
  }
};
