import * as admin from '../handlers/admin.js';
import * as auth from '../handlers/auth.js';
import * as map from '../handlers/map.js';
import * as meta from '../handlers/meta.js';
import * as sync from '../handlers/sync.js';

const route = ({ method, path, handler, phase = 'Phase 1', owner = 'CLI 2', description }) => ({
  method,
  path,
  handler,
  phase,
  owner,
  description
});

export const createRoutes = () => [
  route({
    method: 'GET',
    path: '/health',
    handler: meta.health,
    description: 'Backend health check.'
  }),
  route({
    method: 'GET',
    path: '/api/v1',
    handler: meta.apiMetadata,
    description: 'API metadata.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/routes',
    handler: meta.routesList,
    description: 'Implemented and planned route catalog.'
  }),

  route({
    method: 'POST',
    path: '/api/v1/auth/register/visitor',
    handler: auth.registerVisitor,
    description: 'Register visitor account without email verification.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/auth/register/verified',
    handler: auth.registerVerified,
    description: 'Register student, staff, or faculty account requiring college email OTP.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/auth/otp/request',
    handler: auth.requestOtp,
    description: 'Request OTP for student or staff college email verification.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/auth/otp/verify',
    handler: auth.verifyOtp,
    description: 'Verify OTP and update account verification state.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/auth/login',
    handler: auth.login,
    description: 'Authenticate user and issue JWT pair.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/auth/refresh',
    handler: auth.refresh,
    description: 'Refresh JWT pair.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/me',
    handler: auth.me,
    description: 'Fetch current profile, role, verification state, and contribution cooldown.'
  }),
  route({
    method: 'DELETE',
    path: '/api/v1/me',
    handler: auth.deleteMe,
    description: 'Request account deletion and associated contribution data deletion.'
  }),

  route({
    method: 'GET',
    path: '/api/v1/sync/manifest',
    handler: sync.manifest,
    description: 'Fetch map manifest and current sync cursor.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/sync/changes',
    handler: sync.changes,
    description: 'Fetch changed records since a server-issued cursor.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/sync/changes',
    handler: sync.submitChanges,
    description: 'Submit local deltas for server validation.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/sync/relay-packets',
    handler: sync.relayPackets,
    description: 'Upload relay packets on behalf of offline devices.'
  }),

  route({
    method: 'GET',
    path: '/api/v1/map/buildings',
    handler: map.buildings,
    description: 'Fetch campus building data for local cache.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/map/floors',
    handler: map.floors,
    description: 'Fetch floor metadata for local cache.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/map/locations',
    handler: map.locations,
    description: 'Fetch verified or visible location nodes for local cache.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/map/edges',
    handler: map.edges,
    description: 'Fetch path graph edges for local A* navigation.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/map/qr-anchors',
    handler: map.qrAnchors,
    description: 'Fetch QR snap anchors for PDR drift reset.'
  }),

  route({
    method: 'GET',
    path: '/api/v1/admin/users',
    handler: admin.users,
    description: 'Admin list and role management entrypoint.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/admin/admins',
    handler: admin.createAdmin,
    description: 'Existing admin creates a new admin account.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/admin/users/:id/role',
    handler: admin.assignRole,
    description: 'Existing admin assigns a user role.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/admin/audit',
    handler: admin.audit,
    description: 'Fetch admin audit events.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/admin/map-lock',
    handler: admin.getMapLock,
    description: 'Fetch current mapping lock state.'
  }),
  route({
    method: 'POST',
    path: '/api/v1/admin/map-lock',
    handler: admin.setMapLock,
    description: 'Lock or unlock mapping phase.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/admin/thresholds',
    handler: admin.thresholds,
    description: 'Fetch confirmation thresholds by location category.'
  }),
  route({
    method: 'PUT',
    path: '/api/v1/admin/thresholds/:category',
    handler: admin.updateThreshold,
    description: 'Update confirmation threshold settings by location category.'
  }),
  route({
    method: 'GET',
    path: '/api/v1/admin/pending-locations',
    handler: admin.pendingLocations,
    phase: 'Phase 3 contract implemented as Phase 1 data shape',
    description: 'Future admin dashboard queue for pending location review.'
  })
];
