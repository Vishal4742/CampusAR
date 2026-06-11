import type { FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { USER_ROLES } from '../domain/roles.js';
import { badRequest, forbidden, notFound } from '../http/errors.js';
import type { Services } from '../services/index.js';
import type { User } from '../types.js';
import { requireAdmin } from './admin.js';
import { requireUser } from './auth.js';

export const fingerprintSessionSchema = Type.Object({
  campusId: Type.Optional(Type.String()),
  buildingId: Type.Optional(Type.String()),
  floorId: Type.Optional(Type.String()),
  locationId: Type.Optional(Type.String()),
  coordinateStatus: Type.Optional(Type.String()),
  kind: Type.Optional(Type.String()),
  deviceModel: Type.Optional(Type.String()),
  androidSdk: Type.Optional(Type.String()),
  position: Type.Optional(Type.Any())
});

export const wifiFingerprintSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 }),
  collectedAt: Type.Optional(Type.String()),
  readings: Type.Array(Type.Any(), { minItems: 1 })
});

export const magneticFingerprintSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 }),
  collectedAt: Type.Optional(Type.String()),
  samples: Type.Array(Type.Any(), { minItems: 1 })
});

export const barometerSampleSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 }),
  collectedAt: Type.Optional(Type.String()),
  pressureHpa: Type.Optional(Type.Number()),
  relativeAltitudeMeters: Type.Optional(Type.Number())
});

export const qrAnchorSchema = Type.Object({
  campusId: Type.Optional(Type.String()),
  buildingId: Type.Optional(Type.String()),
  floorId: Type.Optional(Type.String()),
  locationId: Type.Optional(Type.String()),
  codeKey: Type.Optional(Type.String()),
  coordinateStatus: Type.Optional(Type.String()),
  snapPoint: Type.Optional(Type.Any())
});

type Body = Record<string, unknown>;

const isMapperOrAdmin = (user: User): boolean => {
  return user.primaryRole === USER_ROLES.ADMIN || user.primaryRole === USER_ROLES.VERIFIED_MAPPER;
};

export const requireMapper = async (request: FastifyRequest, services: Services): Promise<User> => {
  const user = await requireUser(request, services);
  if (!isMapperOrAdmin(user)) {
    throw forbidden('Verified mapper or admin role is required');
  }
  return user;
};

const objectArray = (value: unknown, name: string): Array<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest(`${name} must be a non-empty array`);
  }
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw badRequest(`${name}[${index}] must be an object`);
    }
    return item;
  });
};

const sessionOrThrow = (services: Services, sessionId: unknown) => {
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw badRequest('sessionId is required');
  }
  const session = services.store.findFingerprintSession(sessionId);
  if (!session) {
    throw notFound('Fingerprint session was not found');
  }
  return session;
};

export const createFingerprintSession = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireMapper(request, services);
  const session = services.store.createFingerprintSession(body, actor);
  return { session };
};

export const submitWifiFingerprints = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireMapper(request, services);
  const session = sessionOrThrow(services, body.sessionId);
  const fingerprint = services.store.addWifiFingerprints({
    session,
    readings: objectArray(body.readings, 'readings'),
    actor,
    body
  });
  return { fingerprint };
};

export const submitMagneticFingerprints = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireMapper(request, services);
  const session = sessionOrThrow(services, body.sessionId);
  const fingerprint = services.store.addMagneticFingerprints({
    session,
    samples: objectArray(body.samples, 'samples'),
    actor,
    body
  });
  return { fingerprint };
};

export const submitBarometerSample = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireMapper(request, services);
  const session = sessionOrThrow(services, body.sessionId);
  const sample = services.store.addBarometerSample({ session, actor, body });
  return { sample };
};

export const proposeQrAnchor = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireMapper(request, services);
  const qrAnchor = services.store.proposeQrAnchor(body, actor);
  return { qrAnchor };
};

export const adminFingerprintSessions = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { sessions: services.store.listFingerprintSessions() };
};

export const approveFingerprintSession = async (request: FastifyRequest, services: Services, id: string) => {
  const actor = await requireAdmin(request, services);
  const session = services.store.reviewFingerprintSession({ id, actor, approved: true });
  if (!session) {
    throw notFound('Fingerprint session was not found');
  }
  services.store.addAudit(actor, 'fingerprint_session_approved', 'fingerprint_session', id, session);
  return { session };
};

export const rejectFingerprintSession = async (request: FastifyRequest, services: Services, id: string) => {
  const actor = await requireAdmin(request, services);
  const session = services.store.reviewFingerprintSession({ id, actor, approved: false });
  if (!session) {
    throw notFound('Fingerprint session was not found');
  }
  services.store.addAudit(actor, 'fingerprint_session_rejected', 'fingerprint_session', id, session);
  return { session };
};

export const adminQrAnchors = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { qrAnchors: services.store.listQrAnchors() };
};

export const approveQrAnchor = async (request: FastifyRequest, services: Services, id: string) => {
  const actor = await requireAdmin(request, services);
  const qrAnchor = services.store.approveQrAnchor({ id, actor });
  if (!qrAnchor) {
    throw notFound('QR anchor was not found');
  }
  services.store.addAudit(actor, 'qr_anchor_approved', 'qr_anchor', id, qrAnchor);
  return { qrAnchor };
};
