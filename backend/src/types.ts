export type UserRole = 'visitor' | 'student' | 'staff' | 'faculty' | 'verified_mapper' | 'admin';
export type VerificationStatus = 'not_required' | 'otp_pending' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type CoordinateStatus = 'unknown' | 'provisional' | 'verified' | 'rejected';
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

export type FingerprintKind = 'wifi_rssi' | 'magnetic' | 'barometer' | 'qr_anchor' | 'mixed';
export type FloorTransitionType = 'stairs' | 'lift' | 'ramp' | 'unknown';
export type WheelchairAccessible = boolean | 'unknown';

export interface FingerprintSession {
  id: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  locationId: string | null;
  position: GeoJsonPoint | null;
  coordinateStatus: CoordinateStatus;
  kind: FingerprintKind;
  deviceModel: string | null;
  androidSdk: string | null;
  verificationStatus: LocationStatus;
  sampleCounts: {
    wifi: number;
    magnetic: number;
    barometer: number;
  };
  submittedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WifiFingerprint {
  id: string;
  sessionId: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  locationId: string | null;
  position: GeoJsonPoint | null;
  coordinateStatus: CoordinateStatus;
  verificationStatus: LocationStatus;
  readings: Array<Record<string, unknown>>;
  collectedAt: string;
  submittedByUserId: string;
  createdAt: string;
}

export interface MagneticFingerprint {
  id: string;
  sessionId: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  locationId: string | null;
  position: GeoJsonPoint | null;
  coordinateStatus: CoordinateStatus;
  verificationStatus: LocationStatus;
  samples: Array<Record<string, unknown>>;
  collectedAt: string;
  submittedByUserId: string;
  createdAt: string;
}

export interface BarometerSample {
  id: string;
  sessionId: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  pressureHpa: number | null;
  relativeAltitudeMeters: number | null;
  verificationStatus: LocationStatus;
  collectedAt: string;
  submittedByUserId: string;
  createdAt: string;
}

export interface FloorProfile {
  id: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  referencePressureHpa: number | null;
  relativeAltitudeMeters: number | null;
  sampleCount: number;
  verificationStatus: LocationStatus;
  updatedAt: string;
}

export interface QrAnchorRecord {
  id: string;
  campusId: string;
  buildingId: string | null;
  floorId: string | null;
  locationId: string | null;
  codeKey: string;
  snapPoint: GeoJsonPoint | null;
  coordinateStatus: CoordinateStatus;
  verificationStatus: LocationStatus;
  active: boolean;
  proposedByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
