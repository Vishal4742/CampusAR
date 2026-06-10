import { badRequest, forbidden, notFound } from '../http/errors.js';
import { isAdmin, USER_ROLES } from '../domain/roles.js';
import { requireUser } from './auth.js';

const requireAdmin = (context) => {
  const user = requireUser(context);
  if (!isAdmin(user)) {
    throw forbidden('Admin role is required');
  }
  return user;
};

export const users = (context) => {
  requireAdmin(context);
  return { body: { users: context.services.store.listUsers() } };
};

export const createAdmin = (context) => {
  const actor = requireAdmin(context);
  const fullName = context.body.fullName;
  const email = context.body.email;

  if (!fullName || !email) {
    throw badRequest('fullName and email are required');
  }

  const user = context.services.store.createUser({
    fullName,
    email,
    primaryRole: USER_ROLES.ADMIN,
    verificationStatus: 'verified'
  });
  context.services.store.addAudit(actor, 'admin_created', 'user', user.id, context.services.store.publicUser(user));

  return {
    statusCode: 201,
    body: { user: context.services.store.publicUser(user) }
  };
};

export const assignRole = (context) => {
  const actor = requireAdmin(context);
  const target = context.services.store.findUserById(context.params.id);
  const role = context.body.role;

  if (!target) {
    throw notFound('Target user was not found');
  }
  if (!Object.values(USER_ROLES).includes(role)) {
    throw badRequest('role is invalid');
  }

  context.services.store.updateUser(target, { primaryRole: role });
  context.services.store.addAudit(actor, 'role_assigned', 'user', target.id, { role });

  return { body: { user: context.services.store.publicUser(target) } };
};

export const audit = (context) => {
  requireAdmin(context);
  return { body: { events: context.services.store.listAuditEvents() } };
};

export const getMapLock = (context) => {
  requireAdmin(context);
  return { body: context.services.store.getMapSettings() };
};

export const setMapLock = (context) => {
  const actor = requireAdmin(context);
  if (typeof context.body.locked !== 'boolean') {
    throw badRequest('locked must be a boolean');
  }
  const state = context.services.store.setMapLock({ locked: context.body.locked, actor });
  context.services.store.addAudit(actor, 'map_lock_updated', 'map_settings', 'singleton', state);
  return { body: state };
};

export const thresholds = (context) => {
  requireAdmin(context);
  return { body: { thresholds: context.services.store.listThresholds() } };
};

export const updateThreshold = (context) => {
  const actor = requireAdmin(context);
  const updates = {};
  if (Number.isInteger(context.body.defaultConfirmationThreshold)) {
    updates.defaultConfirmationThreshold = context.body.defaultConfirmationThreshold;
  }
  if (Number.isInteger(context.body.defaultConfirmationRadiusMeters)) {
    updates.defaultConfirmationRadiusMeters = context.body.defaultConfirmationRadiusMeters;
  }

  const threshold = context.services.store.updateThreshold(context.params.category, updates, actor);
  if (!threshold) {
    throw notFound('Location category threshold was not found');
  }
  context.services.store.addAudit(actor, 'threshold_updated', 'location_category', context.params.category, threshold);
  return { body: { threshold } };
};

export const pendingLocations = (context) => {
  requireAdmin(context);
  return { body: { locations: context.services.store.listPendingLocations() } };
};
