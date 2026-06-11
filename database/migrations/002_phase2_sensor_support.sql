-- CampusAR Phase 2 backend/data support.
-- PostgreSQL/PostGIS planning migration. Review before applying to any database.

DO $$
BEGIN
  CREATE TYPE coordinate_status AS ENUM (
    'unknown',
    'provisional',
    'verified',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE fingerprint_kind AS ENUM (
    'wifi_rssi',
    'magnetic',
    'barometer',
    'qr_anchor',
    'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS fingerprint_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  location_id uuid REFERENCES locations(id),
  position geometry(Point, 4326),
  coordinate_status coordinate_status NOT NULL DEFAULT 'unknown',
  kind fingerprint_kind NOT NULL DEFAULT 'mixed',
  device_model text,
  android_sdk text,
  verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  wifi_sample_count integer NOT NULL DEFAULT 0,
  magnetic_sample_count integer NOT NULL DEFAULT 0,
  barometer_sample_count integer NOT NULL DEFAULT 0,
  submitted_by_user_id uuid REFERENCES app_users(id),
  reviewed_by_user_id uuid REFERENCES app_users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fingerprint_sessions_review_idx
  ON fingerprint_sessions (verification_status, created_at DESC);

CREATE INDEX IF NOT EXISTS fingerprint_sessions_position_gix
  ON fingerprint_sessions USING gist (position);

CREATE TABLE IF NOT EXISTS wifi_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES fingerprint_sessions(id),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  location_id uuid REFERENCES locations(id),
  position geometry(Point, 4326),
  coordinate_status coordinate_status NOT NULL DEFAULT 'unknown',
  verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  readings jsonb NOT NULL,
  collected_at timestamptz NOT NULL,
  submitted_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wifi_fingerprints_readings_array CHECK (jsonb_typeof(readings) = 'array')
);

CREATE INDEX IF NOT EXISTS wifi_fingerprints_cache_idx
  ON wifi_fingerprints (campus_id, building_id, floor_id, verification_status, collected_at DESC);

CREATE INDEX IF NOT EXISTS wifi_fingerprints_position_gix
  ON wifi_fingerprints USING gist (position);

CREATE TABLE IF NOT EXISTS magnetic_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES fingerprint_sessions(id),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  location_id uuid REFERENCES locations(id),
  position geometry(Point, 4326),
  coordinate_status coordinate_status NOT NULL DEFAULT 'unknown',
  verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  samples jsonb NOT NULL,
  collected_at timestamptz NOT NULL,
  submitted_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT magnetic_fingerprints_samples_array CHECK (jsonb_typeof(samples) = 'array')
);

CREATE INDEX IF NOT EXISTS magnetic_fingerprints_cache_idx
  ON magnetic_fingerprints (campus_id, building_id, floor_id, verification_status, collected_at DESC);

CREATE INDEX IF NOT EXISTS magnetic_fingerprints_position_gix
  ON magnetic_fingerprints USING gist (position);

CREATE TABLE IF NOT EXISTS barometer_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES fingerprint_sessions(id),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  pressure_hpa numeric(8,3),
  relative_altitude_meters numeric(8,3),
  verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  collected_at timestamptz NOT NULL,
  submitted_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barometer_samples_cache_idx
  ON barometer_samples (campus_id, building_id, floor_id, verification_status, collected_at DESC);

CREATE TABLE IF NOT EXISTS floor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  reference_pressure_hpa numeric(8,3),
  relative_altitude_meters numeric(8,3),
  sample_count integer NOT NULL DEFAULT 0,
  verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, floor_id)
);

CREATE INDEX IF NOT EXISTS floor_profiles_cache_idx
  ON floor_profiles (campus_id, building_id, floor_id, verification_status);

ALTER TABLE qr_anchors
  ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES campuses(id),
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id),
  ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES floors(id),
  ADD COLUMN IF NOT EXISTS coordinate_status coordinate_status NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS verification_status location_status NOT NULL DEFAULT 'pending_admin_review',
  ADD COLUMN IF NOT EXISTS proposed_by_user_id uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE qr_anchors
  ALTER COLUMN location_id DROP NOT NULL,
  ALTER COLUMN snap_point DROP NOT NULL,
  ALTER COLUMN active SET DEFAULT false;

CREATE INDEX IF NOT EXISTS qr_anchors_review_idx
  ON qr_anchors (verification_status, active, created_at DESC);
