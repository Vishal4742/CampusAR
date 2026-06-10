import type { FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { badRequest, forbidden, notFound } from '../http/errors.js';
import { isAdmin, USER_ROLES } from '../domain/roles.js';
import type { Services } from '../services/index.js';
import type { UserRole } from '../types.js';
import { requireUser } from './auth.js';

export const createAdminSchema = Type.Object({
  fullName: Type.String({ minLength: 1 }),
  email: Type.String({ minLength: 3 })
});

export const assignRoleSchema = Type.Object({ role: Type.String({ minLength: 1 }) });
export const mapLockSchema = Type.Object({ locked: Type.Boolean() });
export const thresholdSchema = Type.Object({
  defaultConfirmationThreshold: Type.Optional(Type.Integer({ minimum: 1 })),
  defaultConfirmationRadiusMeters: Type.Optional(Type.Integer({ minimum: 1 }))
});

type Body = Record<string, unknown>;

export const requireAdmin = async (request: FastifyRequest, services: Services) => {
  const user = await requireUser(request, services);
  if (!isAdmin(user)) {
    throw forbidden('Admin role is required');
  }
  return user;
};

export const users = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { users: services.store.listUsers() };
};

export const createAdmin = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireAdmin(request, services);
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!fullName || !email) {
    throw badRequest('fullName and email are required');
  }

  const user = services.store.createUser({ fullName, email, primaryRole: USER_ROLES.ADMIN, verificationStatus: 'verified' });
  services.store.addAudit(actor, 'admin_created', 'user', user.id, services.store.publicUser(user));
  return { user: services.store.publicUser(user) };
};

export const assignRole = async (request: FastifyRequest, services: Services, id: string, body: Body) => {
  const actor = await requireAdmin(request, services);
  const target = services.store.findUserById(id);
  const role = body.role;

  if (!target) {
    throw notFound('Target user was not found');
  }
  if (typeof role !== 'string' || !(Object.values(USER_ROLES) as string[]).includes(role)) {
    throw badRequest('role is invalid');
  }

  services.store.updateUser(target, { primaryRole: role as UserRole });
  services.store.addAudit(actor, 'role_assigned', 'user', target.id, { role });
  return { user: services.store.publicUser(target) };
};

export const audit = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { events: services.store.listAuditEvents() };
};

export const getMapLock = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return services.store.getMapSettings();
};

export const setMapLock = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireAdmin(request, services);
  if (typeof body.locked !== 'boolean') {
    throw badRequest('locked must be a boolean');
  }
  const state = services.store.setMapLock({ locked: body.locked, actor });
  services.store.addAudit(actor, 'map_lock_updated', 'map_settings', 'singleton', state);
  return state;
};

export const thresholds = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { thresholds: services.store.listThresholds() };
};

export const updateThreshold = async (request: FastifyRequest, services: Services, category: string, body: Body) => {
  const actor = await requireAdmin(request, services);
  const updates: Record<string, unknown> = {};
  if (Number.isInteger(body.defaultConfirmationThreshold)) {
    updates.defaultConfirmationThreshold = body.defaultConfirmationThreshold;
  }
  if (Number.isInteger(body.defaultConfirmationRadiusMeters)) {
    updates.defaultConfirmationRadiusMeters = body.defaultConfirmationRadiusMeters;
  }

  const threshold = services.store.updateThreshold(category, updates, actor);
  if (!threshold) {
    throw notFound('Location category threshold was not found');
  }
  services.store.addAudit(actor, 'threshold_updated', 'location_category', category, threshold);
  return { threshold };
};

export const pendingLocations = async (request: FastifyRequest, services: Services) => {
  await requireAdmin(request, services);
  return { locations: services.store.listPendingLocations() };
};
