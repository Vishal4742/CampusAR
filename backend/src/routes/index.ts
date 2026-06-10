import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as admin from '../handlers/admin.js';
import * as auth from '../handlers/auth.js';
import { ROLE_CAPABILITIES, USER_ROLES } from '../domain/roles.js';
import { normalizeCursor, SYNC_CONTRACT_NOTES } from '../domain/sync.js';
import { requireUser } from '../handlers/auth.js';
import type { Services } from '../services/index.js';

const routeInfo: Array<{ method: string; path: string; phase: string; owner: string; description: string }> = [];

const record = (method: string, path: string, description: string, phase = 'Phase 1') => {
  routeInfo.push({ method, path, phase, owner: 'CLI 2', description });
};

export const createRoutes = (app: FastifyInstance, services: Services) => {
  record('GET', '/health', 'Backend health check.');
  app.get('/health', async () => ({
    status: 'ok',
    service: 'campusar-backend',
    phase: 'Phase 1 TypeScript/Fastify scaffold'
  }));

  record('GET', '/api/v1', 'API metadata.');
  app.get('/api/v1', async () => ({
    name: 'CampusAR API',
    version: 'v1',
    status: 'phase1-typescript-fastify',
    persistence: 'in_memory_until_postgres_tooling_is_connected',
    roles: Object.values(USER_ROLES),
    roleCapabilities: ROLE_CAPABILITIES,
    syncContractNotes: SYNC_CONTRACT_NOTES,
    routeCount: routeInfo.length
  }));

  record('GET', '/api/v1/routes', 'Implemented and planned route catalog.');
  app.get('/api/v1/routes', async () => ({ routes: routeInfo }));

  record('POST', '/api/v1/auth/register/visitor', 'Register visitor account without email verification.');
  app.post('/api/v1/auth/register/visitor', { schema: { body: auth.visitorRegistrationSchema } }, async (request, reply) => {
    reply.status(201);
    return auth.registerVisitor(services, request.body as Record<string, unknown>);
  });

  record('POST', '/api/v1/auth/register/verified', 'Register verified account requiring college email OTP.');
  app.post('/api/v1/auth/register/verified', { schema: { body: auth.verifiedRegistrationSchema } }, async (request, reply) => {
    reply.status(201);
    return auth.registerVerified(services, request.body as Record<string, unknown>);
  });

  record('POST', '/api/v1/auth/otp/request', 'Request OTP for student or staff college email verification.');
  app.post('/api/v1/auth/otp/request', { schema: { body: auth.otpRequestSchema } }, async (request, reply) => {
    reply.status(201);
    return auth.requestOtp(services, request.body as Record<string, unknown>);
  });

  record('POST', '/api/v1/auth/otp/verify', 'Verify OTP and update account verification state.');
  app.post('/api/v1/auth/otp/verify', { schema: { body: auth.otpVerifySchema } }, async (request) => {
    return auth.verifyOtp(services, request.body as Record<string, unknown>);
  });

  record('POST', '/api/v1/auth/login', 'Authenticate user and issue JWT pair.');
  app.post('/api/v1/auth/login', { schema: { body: auth.loginSchema } }, async (request) => {
    return auth.login(services, request.body as Record<string, unknown>);
  });

  record('POST', '/api/v1/auth/refresh', 'Refresh JWT pair.');
  app.post('/api/v1/auth/refresh', { schema: { body: auth.refreshSchema } }, async (request) => {
    return auth.refresh(services, request.body as Record<string, unknown>);
  });

  record('GET', '/api/v1/me', 'Fetch current profile, role, verification state, and contribution cooldown.');
  app.get('/api/v1/me', async (request) => ({ user: services.store.publicUser(await requireUser(request, services)) }));

  record('DELETE', '/api/v1/me', 'Request account deletion and associated contribution data deletion.');
  app.delete('/api/v1/me', async (request) => {
    const user = await requireUser(request, services);
    services.store.deleteUser(user);
    return { deleted: true, userId: user.id };
  });

  record('GET', '/api/v1/sync/manifest', 'Fetch map manifest and current sync cursor.');
  app.get('/api/v1/sync/manifest', async () => services.store.getManifest());

  record('GET', '/api/v1/sync/changes', 'Fetch changed records since a server-issued cursor.');
  app.get('/api/v1/sync/changes', async (request) => {
    const cursor = normalizeCursor((request.query as { since?: string }).since ?? null);
    return {
      cursor,
      latestChangeId: services.store.getManifest().latestChangeId,
      changes: services.store.getChangesSince(cursor)
    };
  });

  const arrayPayloadSchema = Type.Object({ changes: Type.Optional(Type.Array(Type.Any())), packets: Type.Optional(Type.Array(Type.Any())) });

  record('POST', '/api/v1/sync/changes', 'Submit local deltas for server validation.');
  app.post('/api/v1/sync/changes', { schema: { body: arrayPayloadSchema } }, async (request, reply) => {
    const user = await requireUser(request, services);
    const changes = (request.body as { changes?: unknown[] }).changes;
    reply.status(202);
    return {
      results: services.store.acceptClientChanges(Array.isArray(changes) ? changes as Array<Record<string, unknown>> : [], user),
      latestChangeId: services.store.getManifest().latestChangeId
    };
  });

  record('POST', '/api/v1/sync/relay-packets', 'Upload relay packets on behalf of offline devices.');
  app.post('/api/v1/sync/relay-packets', { schema: { body: arrayPayloadSchema } }, async (request, reply) => {
    const user = await requireUser(request, services);
    const packets = (request.body as { packets?: unknown[] }).packets;
    reply.status(202);
    return {
      results: services.store.acceptRelayPackets(Array.isArray(packets) ? packets as Array<Record<string, unknown>> : [], user),
      latestChangeId: services.store.getManifest().latestChangeId
    };
  });

  record('GET', '/api/v1/map/buildings', 'Fetch campus building data for local cache.');
  app.get('/api/v1/map/buildings', async () => ({ buildings: services.store.campus.buildings }));
  record('GET', '/api/v1/map/floors', 'Fetch floor metadata for local cache.');
  app.get('/api/v1/map/floors', async () => ({ floors: services.store.campus.floors }));
  record('GET', '/api/v1/map/locations', 'Fetch visible location nodes for local cache.');
  app.get('/api/v1/map/locations', async () => ({ locations: services.store.campus.locations }));
  record('GET', '/api/v1/map/edges', 'Fetch path graph edges for local A* navigation.');
  app.get('/api/v1/map/edges', async () => ({ edges: services.store.campus.edges }));
  record('GET', '/api/v1/map/qr-anchors', 'Fetch QR snap anchors for PDR drift reset.');
  app.get('/api/v1/map/qr-anchors', async () => ({ qrAnchors: services.store.campus.qrAnchors }));

  record('GET', '/api/v1/admin/users', 'Admin list and role management entrypoint.');
  app.get('/api/v1/admin/users', async (request) => admin.users(request, services));
  record('POST', '/api/v1/admin/admins', 'Existing admin creates a new admin account.');
  app.post('/api/v1/admin/admins', { schema: { body: admin.createAdminSchema } }, async (request, reply) => {
    reply.status(201);
    return admin.createAdmin(request, services, request.body as Record<string, unknown>);
  });
  record('POST', '/api/v1/admin/users/:id/role', 'Existing admin assigns a user role.');
  app.post('/api/v1/admin/users/:id/role', { schema: { body: admin.assignRoleSchema } }, async (request) => {
    return admin.assignRole(request, services, (request.params as { id: string }).id, request.body as Record<string, unknown>);
  });
  record('GET', '/api/v1/admin/audit', 'Fetch admin audit events.');
  app.get('/api/v1/admin/audit', async (request) => admin.audit(request, services));
  record('GET', '/api/v1/admin/map-lock', 'Fetch current mapping lock state.');
  app.get('/api/v1/admin/map-lock', async (request) => admin.getMapLock(request, services));
  record('POST', '/api/v1/admin/map-lock', 'Lock or unlock mapping phase.');
  app.post('/api/v1/admin/map-lock', { schema: { body: admin.mapLockSchema } }, async (request) => {
    return admin.setMapLock(request, services, request.body as Record<string, unknown>);
  });
  record('GET', '/api/v1/admin/thresholds', 'Fetch confirmation thresholds by location category.');
  app.get('/api/v1/admin/thresholds', async (request) => admin.thresholds(request, services));
  record('PUT', '/api/v1/admin/thresholds/:category', 'Update confirmation threshold settings by location category.');
  app.put('/api/v1/admin/thresholds/:category', { schema: { body: admin.thresholdSchema } }, async (request) => {
    return admin.updateThreshold(
      request,
      services,
      (request.params as { category: string }).category,
      request.body as Record<string, unknown>
    );
  });
  record('GET', '/api/v1/admin/pending-locations', 'Future admin dashboard queue for pending location review.', 'Phase 3 contract implemented as Phase 1 data shape');
  app.get('/api/v1/admin/pending-locations', async (request) => admin.pendingLocations(request, services));
};
