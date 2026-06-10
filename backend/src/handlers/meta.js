import { ROLE_CAPABILITIES, USER_ROLES } from '../domain/roles.js';
import { SYNC_CONTRACT_NOTES } from '../domain/sync.js';

const routeCatalog = (routes) => routes.map(({ method, path, phase, owner, description }) => ({
  method,
  path,
  phase,
  owner,
  description
}));

export const health = () => ({
  body: {
    status: 'ok',
    service: 'campusar-backend',
    phase: 'Phase 1 complete for CLI 2 dependency-free scaffold'
  }
});

export const apiMetadata = ({ routes }) => ({
  body: {
    name: 'CampusAR API',
    version: 'v1',
    status: 'phase1-cli2-complete',
    persistence: 'in_memory_until_postgres_tooling_is_selected',
    roles: Object.values(USER_ROLES),
    roleCapabilities: ROLE_CAPABILITIES,
    syncContractNotes: SYNC_CONTRACT_NOTES,
    routeCount: routes.length
  }
});

export const routesList = ({ routes }) => ({
  body: { routes: routeCatalog(routes) }
});
