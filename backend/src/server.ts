import { config } from './config.js';
import { createApp } from './app.js';

const app = await createApp();

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down backend');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ port: config.port, host: config.host });
console.log(`CampusAR backend listening on http://${config.host}:${config.port}`);
