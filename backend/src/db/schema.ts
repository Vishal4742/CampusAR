import { boolean, customType, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const geometry = customType<{ data: unknown; driverData: string }>({
  dataType() {
    return 'geometry';
  }
});

export const userRole = pgEnum('user_role', ['visitor', 'student', 'staff', 'faculty', 'verified_mapper', 'admin']);
export const accountStatus = pgEnum('account_status', ['active', 'suspended', 'deleted']);
export const verificationStatus = pgEnum('verification_status', ['not_required', 'otp_pending', 'verified', 'rejected']);
export const locationStatus = pgEnum('location_status', [
  'draft',
  'pending_confirmation',
  'pending_admin_review',
  'verified',
  'suspended',
  'rejected',
  'expired'
]);

export const appUsers = pgTable('app_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  fullName: text('full_name').notNull(),
  rollNumber: text('roll_number'),
  designation: text('designation'),
  department: text('department'),
  primaryRole: userRole('primary_role').notNull().default('visitor'),
  verificationStatus: verificationStatus('verification_status').notNull().default('not_required'),
  accountStatus: accountStatus('account_status').notNull().default('active'),
  contributionCooldownUntil: timestamp('contribution_cooldown_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
});

export const campuses = pgTable('campuses', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  institution: text('institution').notNull(),
  geofence: geometry('geofence'),
  activeMapVersion: integer('active_map_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  campusId: uuid('campus_id').references(() => campuses.id).notNull(),
  label: text('label').notNull(),
  point: geometry('point'),
  status: locationStatus('status').notNull().default('pending_confirmation'),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }).notNull().default('0'),
  createdBy: uuid('created_by').references(() => appUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const syncChanges = pgTable('sync_changes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  recordType: text('record_type').notNull(),
  recordId: uuid('record_id'),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow()
});

export const relayPacketHashes = pgTable('relay_packet_hashes', {
  packetHash: text('packet_hash').primaryKey(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => appUsers.id),
  state: text('state').notNull(),
  rejectionReason: text('rejection_reason')
});

export const mapSettings = pgTable('map_settings', {
  id: boolean('id').primaryKey().default(true),
  mappingLocked: boolean('mapping_locked').notNull().default(false),
  lockedBy: uuid('locked_by').references(() => appUsers.id),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
