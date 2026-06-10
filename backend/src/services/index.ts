import { config } from '../config.js';
import { createStore } from './store.js';
import { createTokenService } from './token.js';

export const createServices = () => {
  const store = createStore();
  const tokens = createTokenService({
    secret: config.jwtSecret,
    accessTokenSeconds: config.accessTokenSeconds,
    refreshTokenSeconds: config.refreshTokenSeconds
  });

  return { config, store, tokens };
};

export type Services = ReturnType<typeof createServices>;
