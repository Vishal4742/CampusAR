import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { CONTRIBUTION_COOLDOWN_DAYS, USER_ROLES } from '../domain/roles.js';
import { SYNC_RESULT } from '../domain/sync.js';

const nowIso = () => new Date().toISOString();

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
};

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

const publicUser = (user) => ({
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
  const octPinId = randomUUID();
  const oistPinId = randomUUID();

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
      centroid: {
        type: 'Point',
        coordinates: [77.5019383, 23.2462927],
        source: 'https://maps.app.goo.gl/PoESLVac4tegAM489'
      },
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
      name: 'Seed Zone Placeholder',
      purpose: 'navigation_seed'
    }],
    categories: [
      { key: 'campus_pin', label: 'Campus Pin', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'gate', label: 'Gate', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'classroom', label: 'Classroom', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'lab', label: 'Lab', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'faculty_room', label: 'Faculty Room', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 },
      { key: 'admin_office', label: 'Admin Office', defaultConfirmationThreshold: 3, defaultConfirmationRadiusMeters: 15 }
    ],
    locations: [
      {
        id: octPinId,
        campusId,
        buildingId,
        floorId,
        zoneId,
        categoryKey: 'campus_pin',
        label: 'Oriental College of Technology Google Maps Pin',
        point: {
          type: 'Point',
          coordinates: [77.5019383, 23.2462927],
          source: 'https://maps.app.goo.gl/PoESLVac4tegAM489'
        },
        status: 'draft',
        confidenceScore: 0
      },
      {
        id: oistPinId,
        campusId,
        buildingId: null,
        floorId: null,
        zoneId,
        categoryKey: 'campus_pin',
        label: 'Oriental Institute of Science and Technology Google Maps Pin',
        point: {
          type: 'Point',
          coordinates: [77.5029367, 23.2487036],
          source: 'https://maps.app.goo.gl/xUen8Rr4UNMqDgfR6'
        },
        status: 'draft',
        confidenceScore: 0
      }
    ],
    edges: [],
    qrAnchors: []
  };
};

export const createStore = () => {
  const campus = seedCampus();
  const users = new Map();
  const otps = new Map();
  const syncChanges = [];
  const relayPackets = new Map();
  const auditEvents = [];
  const mapSettings = {
    mappingLocked: false,
    updatedAt: nowIso(),
    updatedBy: null
  };

  const thresholds = new Map(
    campus.categories.map((category) => [category.key, { ...category }])
  );

  let changeId = 0;

  const appendChange = (recordType, operation, payload) => {
    const change = {
      id: ++changeId,
      recordType,
      operation,
      payload,
      changedAt: nowIso()
    };
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
  }) => {
    const createdAt = nowIso();
    const user = {
      id: randomUUID(),
      email: email ? String(email).toLowerCase() : null,
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
    findUserById(id) {
      const user = users.get(id);
      return user?.accountStatus === 'deleted' ? null : user;
    },
    findUserByEmail(email) {
      const normalized = String(email ?? '').toLowerCase();
      return [...users.values()].find((user) => user.email === normalized && user.accountStatus !== 'deleted') ?? null;
    },
    listUsers() {
      return [...users.values()].map(publicUser);
    },
    updateUser(user, updates) {
      Object.assign(user, updates, { updatedAt: nowIso() });
      appendChange('user', 'updated', publicUser(user));
      return user;
    },
    deleteUser(user) {
      Object.assign(user, {
        accountStatus: 'deleted',
        deletedAt: nowIso(),
        updatedAt: nowIso()
      });
      appendChange('user', 'deleted', { id: user.id });
      return user;
    },

    createOtp({ userId, email, purpose = 'email_verification' }) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const otp = {
        id: randomUUID(),
        userId,
        targetEmail: String(email).toLowerCase(),
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
    verifyOtp({ email, code, challengeId }) {
      const normalized = String(email ?? '').toLowerCase();
      const candidates = [...otps.values()].filter((otp) => {
        return !otp.consumedAt
          && otp.targetEmail === normalized
          && (!challengeId || otp.id === challengeId)
          && new Date(otp.expiresAt) > new Date();
      });

      const otp = candidates.at(-1);
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
    getChangesSince(cursor) {
      return syncChanges.filter((change) => change.id > cursor);
    },
    acceptClientChanges(changes, actor) {
      return changes.map((change) => {
        const accepted = appendChange(change.recordType ?? 'client_delta', change.operation ?? 'upsert', {
          ...change.payload,
          submittedBy: actor.id
        });
        return {
          clientId: change.clientId ?? null,
          result: SYNC_RESULT.ACCEPTED,
          serverChangeId: accepted.id
        };
      });
    },
    acceptRelayPackets(packets, actor) {
      return packets.map((packet) => {
        const packetHash = packet.packetHash ?? packet.hash;
        if (!packetHash) {
          return { result: SYNC_RESULT.REJECTED, reason: 'packetHash is required' };
        }
        if (relayPackets.has(packetHash)) {
          return { packetHash, result: SYNC_RESULT.DUPLICATE };
        }
        relayPackets.set(packetHash, {
          packetHash,
          uploadedByUserId: actor.id,
          firstSeenAt: nowIso(),
          payload: packet.payload ?? null
        });
        appendChange('relay_packet', 'accepted', { packetHash, uploadedByUserId: actor.id });
        return { packetHash, result: SYNC_RESULT.ACCEPTED };
      });
    },

    getMapSettings() {
      return { ...mapSettings };
    },
    setMapLock({ locked, actor }) {
      mapSettings.mappingLocked = Boolean(locked);
      mapSettings.updatedAt = nowIso();
      mapSettings.updatedBy = actor.id;
      appendChange('map_settings', 'updated', { ...mapSettings });
      return { ...mapSettings };
    },
    listThresholds() {
      return [...thresholds.values()];
    },
    updateThreshold(categoryKey, updates, actor) {
      const current = thresholds.get(categoryKey);
      if (!current) {
        return null;
      }
      const next = {
        ...current,
        ...updates,
        key: categoryKey
      };
      thresholds.set(categoryKey, next);
      appendChange('threshold', 'updated', { ...next, updatedBy: actor.id });
      return next;
    },

    addAudit(actor, action, targetType, targetId, newValue = null) {
      const event = {
        id: randomUUID(),
        actorUserId: actor?.id ?? null,
        action,
        targetType,
        targetId,
        newValue,
        createdAt: nowIso()
      };
      auditEvents.push(event);
      return event;
    },
    listAuditEvents() {
      return auditEvents;
    },
    listPendingLocations() {
      return campus.locations.filter((location) => {
        return ['pending_confirmation', 'pending_admin_review'].includes(location.status);
      });
    }
  };
};
