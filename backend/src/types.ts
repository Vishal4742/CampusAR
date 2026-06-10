export type UserRole = 'visitor' | 'student' | 'staff' | 'faculty' | 'verified_mapper' | 'admin';
export type VerificationStatus = 'not_required' | 'otp_pending' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type LocationStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'pending_admin_review'
  | 'verified'
  | 'suspended'
  | 'rejected'
  | 'expired';

export interface PublicUser {
  id: string;
  email: string | null;
  fullName: string;
  rollNumber: string | null;
  designation: string | null;
  department: string | null;
  primaryRole: UserRole;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  contributionCooldownUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends PublicUser {
  deletedAt: string | null;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
  source?: string;
}

export interface LocationRecord {
  id: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string;
  categoryKey: string;
  label: string;
  point: GeoJsonPoint | null;
  status: LocationStatus;
  confidenceScore: number;
}

export interface SyncChange {
  id: number;
  recordType: string;
  operation: string;
  payload: unknown;
  changedAt: string;
}
