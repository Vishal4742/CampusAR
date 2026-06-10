import { config } from '../config.js';
import { createEmailService } from './email.js';
import { createStore } from './store.js';
import { createTokenService } from './token.js';

export const createServices = () => {
  const store = createStore();
  const tokens = createTokenService({
    secret: config.jwtSecret,
    accessTokenSeconds: config.accessTokenSeconds,
    refreshTokenSeconds: config.refreshTokenSeconds
  });
  const email = createEmailService(config);

  return { config, store, tokens, email };
};

export type Services = ReturnType<typeof createServices>;
