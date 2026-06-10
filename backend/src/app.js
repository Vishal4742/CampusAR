import { readJsonBody } from './http/body.js';
import { createRouter } from './http/router.js';
import { sendError, sendJson } from './http/respond.js';
import { createRoutes } from './routes/index.js';
import { createServices } from './services/index.js';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-max-age': '86400'
};

export const createApp = ({ services = createServices() } = {}) => {
  const routes = createRoutes(services);
  const router = createRouter(routes);

  return {
    services,
    routes,

    async handle(request, response) {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
      }

      const baseUrl = `http://${request.headers.host ?? 'localhost'}`;
      const url = new URL(request.url ?? '/', baseUrl);
      const match = router.match(request.method ?? 'GET', url.pathname);

      if (!match) {
        sendError(response, 404, 'not_found', `No CampusAR backend route is planned for ${request.method} ${url.pathname}`, corsHeaders);
        return;
      }

      try {
        const body = await readJsonBody(request);
        const result = await match.route.handler({
          request,
          url,
          body,
          params: match.params,
          services,
          routes
        });

        sendJson(response, result.statusCode ?? 200, result.body ?? result, corsHeaders);
      } catch (error) {
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        sendError(
          response,
          statusCode,
          error.code ?? 'internal_error',
          error.expose ? error.message : 'Internal backend scaffold error',
          corsHeaders
        );
      }
    }
  };
};
