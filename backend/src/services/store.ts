import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { CONTRIBUTION_COOLDOWN_DAYS, USER_ROLES } from '../domain/roles.js';
import { SYNC_RESULT } from '../domain/sync.js';
import type { GeoJsonPoint, LocationRecord, PublicUser, SyncChange, User, UserRole, VerificationStatus } from '../types.js';

const nowIso = (): string => new Date().toISOString();

const addDays = (date: string, days: number): string => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
};

const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

const point = (longitude: number, latitude: number, source: string): GeoJsonPoint => ({
  type: 'Point',
  coordinates: [longitude, latitude],
  source
});

const publicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  rollNumber: user.rollNumber,
  designation: user.designation,
  department: user.department,
  primaryRole: user.primaryRole,
  verificationStatus: user.verificationStatus,
  accountStatus: user.accountStatus,
  contributionCooldownUntil: user.contributionCooldownUntil,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const seedCampus = () => {
  const campusId = randomUUID();
  const buildingId = randomUUID();
  const floorId = randomUUID();
  const zoneId = randomUUID();

  const locations: LocationRecord[] = [
    {
      id: randomUUID(),
      campusId,
      buildingId,
      floorId,
      zoneId,
      categoryKey: 'campus_pin',
      label: 'Oriental College of Technology Google Maps Pin',
      point: point(77.5019383, 23.2462927, 'https://maps.app.goo.gl/PoESLVac4tegAM489'),
      status: 'draft',
      confidenceScore: 0
    },
    {
      id: randomUUID(),
      campusId,
      buildingId: null,
      floorId: null,
      zoneId,
      categoryKey: 'campus_pin',
      label: 'Oriental Institute of Science and Technology Google Maps Pin',
      point: point(77.5029367, 23.2487036, 'https://maps.app.goo.gl/xUen8Rr4UNMqDgfR6'),
      status: 'draft',
      confidenceScore: 0
    }
  ];

  return {
    campuses: [{
      id: campusId,
      name: 'Oriental College of Technology, Bhopal',
      institution: 'Oriental College of Technology, Bhopal',
      geofence: null,
      activeMapVersion: 1,
      source: 'user_google_maps_links'
    }],
    buildings: [{
      id: buildingId,
      campusId,
      name: 'Oriental College of Technology Google Maps Pin',
      code: 'OCT',
      centroid: point(77.5019383, 23.2462927, 'https://maps.app.goo.gl/PoESLVac4tegAM489'),
      footprint: null
    }],
    floors: [{
      id: floorId,
      buildingId,
      floorLabel: 'Ground',
      floorIndex: 0
    }],
    zones: [{
      id: zoneId,
      campusId,
      buildingId,
      floorId,
      name: 'Draft campus bootstrap zone',
      purpose: 'mapping_bootstrap'
    }],
    categories: [
      { key: 'campus_pin', label: 'Campus Pin', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'gate', label: 'Gate', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'classroom', label: 'Classroom', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'lab', label: 'Lab', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'faculty_room', label: 'Faculty Room', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'admin_office', label: 'Admin Office', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 }
    ],
    locations,
    edges: [] as unknown[],
    qrAnchors: [] as unknown[]
  };
};

interface OtpChallenge {
  id: string;
  userId: string;
  targetEmail: string;
  purpose: string;
  codeHash: string;
  expiresAt: string;
  consumedAt: string | null;
  attemptCount: number;
  createdAt: string;
}

export const createStore = () => {
  const campus = seedCampus();
  const users = new Map<string, User>();
  const otps = new Map<string, OtpChallenge>();
  const syncChanges: SyncChange[] = [];
  const relayPackets = new Map<string, unknown>();
  const auditEvents: unknown[] = [];
  const mapSettings = { mappingLocked: false, updatedAt: nowIso(), updatedBy: null as string | null };
  const thresholds = new Map(campus.categories.map((category) => [category.key, { ...category }]));
  let changeId = 0;

  const appendChange = (recordType: string, operation: string, payload: unknown): SyncChange => {
    const change = { id: ++changeId, recordType, operation, payload, changedAt: nowIso() };
    syncChanges.push(change);
    return change;
  };

  const createUser = ({
    email = null,
    fullName,
    rollNumber = null,
    designation = null,
    department = null,
    primaryRole = USER_ROLES.VISITOR,
    verificationStatus = 'not_required'
  }: {
    email?: string | null;
    fullName: string;
    rollNumber?: string | null;
    designation?: string | null;
    department?: string | null;
    primaryRole?: UserRole;
    verificationStatus?: VerificationStatus;
  }): User => {
    const createdAt = nowIso();
    const user: User = {
      id: randomUUID(),
      email: email ? email.toLowerCase() : null,
      fullName,
      rollNumber,
      designation,
      department,
      primaryRole,
      verificationStatus,
      accountStatus: 'active',
      contributionCooldownUntil: addDays(createdAt, CONTRIBUTION_COOLDOWN_DAYS),
      createdAt,
      updatedAt: createdAt,
      deletedAt: null
    };
    users.set(user.id, user);
    appendChange('user', 'created', publicUser(user));
    return user;
  };

  if (config.seedAdminEmail) {
    createUser({
      email: config.seedAdminEmail,
      fullName: config.seedAdminName,
      primaryRole: USER_ROLES.ADMIN,
      verificationStatus: 'verified'
    });
  }

  return {
    campus,
    appendChange,
    publicUser,
    createUser,
    findUserById(id: string): User | null {
      const user = users.get(id);
      return user && user.accountStatus !== 'deleted' ? user : null;
    },
    findUserByEmail(email: string): User | null {
      const normalized = email.toLowerCase();
      return [...users.values()].find((user) => user.email === normalized && user.accountStatus !== 'deleted') ?? null;
    },
    listUsers(): PublicUser[] {
      return [...users.values()].map(publicUser);
    },
    updateUser(user: User, updates: Partial<User>): User {
      Object.assign(user, updates, { updatedAt: nowIso() });
      appendChange('user', 'updated', publicUser(user));
      return user;
    },
    deleteUser(user: User): User {
      Object.assign(user, { accountStatus: 'deleted' as const, deletedAt: nowIso(), updatedAt: nowIso() });
      appendChange('user', 'deleted', { id: user.id });
      return user;
    },
    createOtp({ userId, email, purpose = 'email_verification' }: { userId: string; email: string; purpose?: string }) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const otp: OtpChallenge = {
        id: randomUUID(),
        userId,
        targetEmail: email.toLowerCase(),
        purpose,
        codeHash: hash(code),
        expiresAt: addDays(nowIso(), 1),
        consumedAt: null,
        attemptCount: 0,
        createdAt: nowIso()
      };
      otps.set(otp.id, otp);
      return { otp, code };
    },
    verifyOtp({ email, code, challengeId }: { email: string; code: string; challengeId?: string }): OtpChallenge | null {
      const normalized = email.toLowerCase();
      const otp = [...otps.values()].filter((candidate) => {
        return !candidate.consumedAt
          && candidate.targetEmail === normalized
          && (!challengeId || candidate.id === challengeId)
          && new Date(candidate.expiresAt) > new Date();
      }).at(-1);

      if (!otp) {
        return null;
      }

      otp.attemptCount += 1;
      if (otp.codeHash !== hash(code)) {
        return null;
      }

      otp.consumedAt = nowIso();
      return otp;
    },
    getManifest() {
      return {
        mapVersion: 1,
        latestChangeId: changeId,
        mappingLocked: mapSettings.mappingLocked,
        counts: {
          buildings: campus.buildings.length,
          floors: campus.floors.length,
          zones: campus.zones.length,
          locations: campus.locations.length,
          edges: campus.edges.length,
          qrAnchors: campus.qrAnchors.length
        }
      };
    },
    getChangesSince(cursor: number): SyncChange[] {
      return syncChanges.filter((change) => change.id > cursor);
    },
    acceptClientChanges(changes: Array<Record<string, unknown>>, actor: User) {
      return changes.map((change) => {
        const accepted = appendChange(String(change.recordType ?? 'client_delta'), String(change.operation ?? 'upsert'), {
          payload: change.payload ?? null,
          submittedBy: actor.id
        });
        return { clientId: change.clientId ?? null, result: SYNC_RESULT.ACCEPTED, serverChangeId: accepted.id };
      });
    },
    acceptRelayPackets(packets: Array<Record<string, unknown>>, actor: User) {
      return packets.map((packet) => {
        const packetHash = packet.packetHash ?? packet.hash;
        if (typeof packetHash !== 'string' || !packetHash) {
          return { result: SYNC_RESULT.REJECTED, reason: 'packetHash is required' };
        }
        if (relayPackets.has(packetHash)) {
          return { packetHash, result: SYNC_RESULT.DUPLICATE };
        }
        relayPackets.set(packetHash, { packetHash, uploadedByUserId: actor.id, firstSeenAt: nowIso(), payload: packet.payload ?? null });
        appendChange('relay_packet', 'accepted', { packetHash, uploadedByUserId: actor.id });
        return { packetHash, result: SYNC_RESULT.ACCEPTED };
      });
    },
    getMapSettings() {
      return { ...mapSettings };
    },
    setMapLock({ locked, actor }: { locked: boolean; actor: User }) {
      mapSettings.mappingLocked = locked;
      mapSettings.updatedAt = nowIso();
      mapSettings.updatedBy = actor.id;
      appendChange('map_settings', 'updated', { ...mapSettings });
      return { ...mapSettings };
    },
    listThresholds() {
      return [...thresholds.values()];
    },
    updateThreshold(categoryKey: string, updates: Record<string, unknown>, actor: User) {
      const current = thresholds.get(categoryKey);
      if (!current) {
        return null;
      }
      const next = { ...current, ...updates, key: categoryKey };
      thresholds.set(categoryKey, next);
      appendChange('threshold', 'updated', { ...next, updatedBy: actor.id });
      return next;
    },
    addAudit(actor: User | null, action: string, targetType: string, targetId: string, newValue: unknown = null) {
      const event = { id: randomUUID(), actorUserId: actor?.id ?? null, action, targetType, targetId, newValue, createdAt: nowIso() };
      auditEvents.push(event);
      return event;
    },
    listAuditEvents() {
      return auditEvents;
    },
    listPendingLocations() {
      return campus.locations.filter((location) => ['pending_confirmation', 'pending_admin_review'].includes(location.status));
    }
  };
};

export type Store = ReturnType<typeof createStore>;
