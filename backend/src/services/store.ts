import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { CONTRIBUTION_COOLDOWN_DAYS, USER_ROLES } from '../domain/roles.js';
import { SYNC_RESULT } from '../domain/sync.js';
import type {
  BarometerSample,
  CoordinateStatus,
  FingerprintKind,
  FingerprintSession,
  FloorProfile,
  GeoJsonPoint,
  LocationRecord,
  MagneticFingerprint,
  PublicUser,
  QrAnchorRecord,
  SyncChange,
  User,
  UserRole,
  VerificationStatus,
  WifiFingerprint
} from '../types.js';

const nowIso = (): string => new Date().toISOString();

const addDays = (date: string, days: number): string => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
};

const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const stringOrNull = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const stringOrFallback = (value: unknown, fallback: string): string => stringOrNull(value) ?? fallback;

const numberOrNull = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const averageOrNull = (values: Array<number | null>): number | null => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

const coordinateStatus = (value: unknown): CoordinateStatus => {
  return value === 'provisional' || value === 'verified' || value === 'rejected' ? value : 'unknown';
};

const fingerprintKind = (value: unknown): FingerprintKind => {
  return value === 'wifi_rssi' || value === 'magnetic' || value === 'barometer' || value === 'qr_anchor' ? value : 'mixed';
};

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
  const fingerprintSessions: FingerprintSession[] = [];
  const wifiFingerprints: WifiFingerprint[] = [];
  const magneticFingerprints: MagneticFingerprint[] = [];
  const barometerSamples: BarometerSample[] = [];
  const floorProfiles: FloorProfile[] = [];
  const qrAnchors: QrAnchorRecord[] = [];
  const mapSettings = { mappingLocked: false, updatedAt: nowIso(), updatedBy: null as string | null };
  const thresholds = new Map(campus.categories.map((category) => [category.key, { ...category }]));
  let changeId = 0;
  const defaultCampusId = campus.campuses[0]?.id ?? 'oct-bhopal';

  const appendChange = (recordType: string, operation: string, payload: unknown): SyncChange => {
    const change = { id: ++changeId, recordType, operation, payload, changedAt: nowIso() };
    syncChanges.push(change);
    return change;
  };

  const upsertFloorProfile = (session: FingerprintSession, updatedAt: string): FloorProfile | null => {
    const samples = barometerSamples.filter((sample) => {
      return sample.verificationStatus === 'verified'
        && sample.campusId === session.campusId
        && sample.buildingId === session.buildingId
        && sample.floorId === session.floorId;
    });
    if (samples.length === 0) {
      return null;
    }

    const existing = floorProfiles.find((profile) => {
      return profile.campusId === session.campusId
        && profile.buildingId === session.buildingId
        && profile.floorId === session.floorId;
    });
    const profile = existing ?? {
      id: randomUUID(),
      campusId: session.campusId,
      buildingId: session.buildingId,
      floorId: session.floorId,
      referencePressureHpa: null,
      relativeAltitudeMeters: null,
      sampleCount: 0,
      verificationStatus: 'verified' as const,
      updatedAt
    };

    profile.referencePressureHpa = averageOrNull(samples.map((sample) => sample.pressureHpa));
    profile.relativeAltitudeMeters = averageOrNull(samples.map((sample) => sample.relativeAltitudeMeters));
    profile.sampleCount = samples.length;
    profile.verificationStatus = 'verified';
    profile.updatedAt = updatedAt;

    if (!existing) {
      floorProfiles.push(profile);
    }
    appendChange('floor_profile', existing ? 'updated' : 'created', profile);
    return profile;
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
          qrAnchors: qrAnchors.filter((anchor) => anchor.active && anchor.verificationStatus === 'verified').length,
          wifiFingerprints: wifiFingerprints.filter((fingerprint) => fingerprint.verificationStatus === 'verified').length,
          magneticFingerprints: magneticFingerprints.filter((fingerprint) => fingerprint.verificationStatus === 'verified').length,
          floorProfiles: floorProfiles.filter((profile) => profile.verificationStatus === 'verified').length
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
    },
    listFloorProfiles({ buildingId }: { buildingId?: string | null } = {}) {
      return floorProfiles.filter((profile) => !buildingId || profile.buildingId === buildingId);
    },
    listWifiFingerprints({ campusId, buildingId, floorId, approvedOnly = true }: {
      campusId?: string | null;
      buildingId?: string | null;
      floorId?: string | null;
      approvedOnly?: boolean;
    } = {}) {
      return wifiFingerprints.filter((fingerprint) => {
        return (!approvedOnly || fingerprint.verificationStatus === 'verified')
          && (!campusId || fingerprint.campusId === campusId)
          && (!buildingId || fingerprint.buildingId === buildingId)
          && (!floorId || fingerprint.floorId === floorId);
      });
    },
    listMagneticFingerprints({ campusId, buildingId, floorId, approvedOnly = true }: {
      campusId?: string | null;
      buildingId?: string | null;
      floorId?: string | null;
      approvedOnly?: boolean;
    } = {}) {
      return magneticFingerprints.filter((fingerprint) => {
        return (!approvedOnly || fingerprint.verificationStatus === 'verified')
          && (!campusId || fingerprint.campusId === campusId)
          && (!buildingId || fingerprint.buildingId === buildingId)
          && (!floorId || fingerprint.floorId === floorId);
      });
    },
    createFingerprintSession(body: Record<string, unknown>, actor: User): FingerprintSession {
      const createdAt = nowIso();
      const session: FingerprintSession = {
        id: randomUUID(),
        campusId: stringOrFallback(body.campusId, defaultCampusId),
        buildingId: stringOrNull(body.buildingId),
        floorId: stringOrNull(body.floorId),
        locationId: stringOrNull(body.locationId),
        position: isRecord(body.position) ? body.position as unknown as GeoJsonPoint : null,
        coordinateStatus: coordinateStatus(body.coordinateStatus),
        kind: fingerprintKind(body.kind),
        deviceModel: stringOrNull(body.deviceModel),
        androidSdk: stringOrNull(body.androidSdk),
        verificationStatus: 'pending_admin_review',
        sampleCounts: { wifi: 0, magnetic: 0, barometer: 0 },
        submittedByUserId: actor.id,
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt,
        updatedAt: createdAt
      };
      fingerprintSessions.push(session);
      appendChange('fingerprint_session', 'created', session);
      return session;
    },
    findFingerprintSession(id: string): FingerprintSession | null {
      return fingerprintSessions.find((session) => session.id === id) ?? null;
    },
    listFingerprintSessions() {
      return fingerprintSessions;
    },
    addWifiFingerprints({ session, readings, actor, body }: {
      session: FingerprintSession;
      readings: Array<Record<string, unknown>>;
      actor: User;
      body: Record<string, unknown>;
    }): WifiFingerprint {
      const createdAt = nowIso();
      const record: WifiFingerprint = {
        id: randomUUID(),
        sessionId: session.id,
        campusId: session.campusId,
        buildingId: session.buildingId,
        floorId: session.floorId,
        locationId: session.locationId,
        position: session.position,
        coordinateStatus: session.coordinateStatus,
        verificationStatus: 'pending_admin_review',
        readings,
        collectedAt: stringOrFallback(body.collectedAt, createdAt),
        submittedByUserId: actor.id,
        createdAt
      };
      wifiFingerprints.push(record);
      session.sampleCounts.wifi += readings.length;
      session.updatedAt = createdAt;
      appendChange('wifi_fingerprint', 'created', record);
      return record;
    },
    addMagneticFingerprints({ session, samples, actor, body }: {
      session: FingerprintSession;
      samples: Array<Record<string, unknown>>;
      actor: User;
      body: Record<string, unknown>;
    }): MagneticFingerprint {
      const createdAt = nowIso();
      const record: MagneticFingerprint = {
        id: randomUUID(),
        sessionId: session.id,
        campusId: session.campusId,
        buildingId: session.buildingId,
        floorId: session.floorId,
        locationId: session.locationId,
        position: session.position,
        coordinateStatus: session.coordinateStatus,
        verificationStatus: 'pending_admin_review',
        samples,
        collectedAt: stringOrFallback(body.collectedAt, createdAt),
        submittedByUserId: actor.id,
        createdAt
      };
      magneticFingerprints.push(record);
      session.sampleCounts.magnetic += samples.length;
      session.updatedAt = createdAt;
      appendChange('magnetic_fingerprint', 'created', record);
      return record;
    },
    addBarometerSample({ session, actor, body }: {
      session: FingerprintSession;
      actor: User;
      body: Record<string, unknown>;
    }): BarometerSample {
      const createdAt = nowIso();
      const record: BarometerSample = {
        id: randomUUID(),
        sessionId: session.id,
        campusId: session.campusId,
        buildingId: session.buildingId,
        floorId: session.floorId,
        pressureHpa: numberOrNull(body.pressureHpa),
        relativeAltitudeMeters: numberOrNull(body.relativeAltitudeMeters),
        verificationStatus: 'pending_admin_review',
        collectedAt: stringOrFallback(body.collectedAt, createdAt),
        submittedByUserId: actor.id,
        createdAt
      };
      barometerSamples.push(record);
      session.sampleCounts.barometer += 1;
      session.updatedAt = createdAt;
      appendChange('barometer_sample', 'created', record);
      return record;
    },
    reviewFingerprintSession({ id, actor, approved }: { id: string; actor: User; approved: boolean }) {
      const session = fingerprintSessions.find((candidate) => candidate.id === id);
      if (!session) {
        return null;
      }
      const status = approved ? 'verified' : 'rejected';
      const reviewedAt = nowIso();
      session.verificationStatus = status;
      session.reviewedByUserId = actor.id;
      session.reviewedAt = reviewedAt;
      session.updatedAt = reviewedAt;
      wifiFingerprints.filter((record) => record.sessionId === id).forEach((record) => {
        record.verificationStatus = status;
      });
      magneticFingerprints.filter((record) => record.sessionId === id).forEach((record) => {
        record.verificationStatus = status;
      });
      barometerSamples.filter((record) => record.sessionId === id).forEach((record) => {
        record.verificationStatus = status;
      });
      if (approved) {
        upsertFloorProfile(session, reviewedAt);
      }
      appendChange('fingerprint_session', approved ? 'approved' : 'rejected', session);
      return session;
    },
    listQrAnchors({ approvedOnly = false }: { approvedOnly?: boolean } = {}) {
      return qrAnchors.filter((anchor) => !approvedOnly || (anchor.active && anchor.verificationStatus === 'verified'));
    },
    proposeQrAnchor(body: Record<string, unknown>, actor: User): QrAnchorRecord {
      const createdAt = nowIso();
      const anchor: QrAnchorRecord = {
        id: randomUUID(),
        campusId: stringOrFallback(body.campusId, defaultCampusId),
        buildingId: stringOrNull(body.buildingId),
        floorId: stringOrNull(body.floorId),
        locationId: stringOrNull(body.locationId),
        codeKey: stringOrFallback(body.codeKey, `qr-${randomUUID()}`),
        snapPoint: isRecord(body.snapPoint) ? body.snapPoint as unknown as GeoJsonPoint : null,
        coordinateStatus: coordinateStatus(body.coordinateStatus),
        verificationStatus: 'pending_admin_review',
        active: false,
        proposedByUserId: actor.id,
        approvedByUserId: null,
        approvedAt: null,
        createdAt,
        updatedAt: createdAt
      };
      qrAnchors.push(anchor);
      appendChange('qr_anchor', 'created', anchor);
      return anchor;
    },
    approveQrAnchor({ id, actor }: { id: string; actor: User }) {
      const anchor = qrAnchors.find((candidate) => candidate.id === id);
      if (!anchor) {
        return null;
      }
      const approvedAt = nowIso();
      anchor.verificationStatus = 'verified';
      anchor.active = true;
      anchor.approvedByUserId = actor.id;
      anchor.approvedAt = approvedAt;
      anchor.updatedAt = approvedAt;
      appendChange('qr_anchor', 'approved', anchor);
      return anchor;
    }
  };
};

export type Store = ReturnType<typeof createStore>;
