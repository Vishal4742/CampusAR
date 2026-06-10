import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const host = process.env.HOST ?? '0.0.0.0';
const app = createApp();

const server = createServer((request, response) => {
  app.handle(request, response);
});

server.listen(port, host, () => {
  console.log(`CampusAR backend scaffold listening on http://${host}:${port}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}; shutting down backend scaffold`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
