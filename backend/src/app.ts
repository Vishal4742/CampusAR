import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import { HttpError } from './http/errors.js';
import { createRoutes } from './routes/index.js';
import { createServices, type Services } from './services/index.js';

type ValidationError = FastifyError & { validation?: unknown };

export const createApp = async ({ services = createServices() }: { services?: Services } = {}) => {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });

  app.setErrorHandler((error: ValidationError, _request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }

    if ('validation' in error) {
      reply.status(400).send({ error: 'validation_error', message: error.message });
      return;
    }

    reply.status(500).send({ error: 'internal_error', message: 'Internal backend scaffold error' });
  });

  createRoutes(app, services);

  return app;
};
