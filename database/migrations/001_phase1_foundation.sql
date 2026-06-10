-- CampusAR Phase 1 backend/data foundation.
-- PostgreSQL/PostGIS planning migration. Review before applying to any database.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM (
    'visitor',
    'student',
    'staff',
    'faculty',
    'verified_mapper',
    'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE account_status AS ENUM (
    'active',
    'suspended',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE verification_status AS ENUM (
    'not_required',
    'otp_pending',
    'verified',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE location_status AS ENUM (
    'draft',
    'pending_confirmation',
    'pending_admin_review',
    'verified',
    'suspended',
    'rejected',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  full_name text NOT NULL,
  roll_number text,
  designation text,
  department text,
  primary_role user_role NOT NULL DEFAULT 'visitor',
  verification_status verification_status NOT NULL DEFAULT 'not_required',
  account_status account_status NOT NULL DEFAULT 'active',
  contribution_cooldown_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT app_users_email_nonempty CHECK (email IS NULL OR length(trim(email)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique_lower
  ON app_users (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  role user_role NOT NULL,
  assigned_by uuid REFERENCES app_users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  reason text
);

CREATE INDEX IF NOT EXISTS user_role_assignments_user_idx
  ON user_role_assignments (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id),
  target_email text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_challenges_email_idx
  ON otp_challenges (lower(target_email), expires_at);

CREATE TABLE IF NOT EXISTS campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  institution text NOT NULL,
  geofence geometry(Polygon, 4326),
  active_map_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campuses_geofence_gix
  ON campuses USING gist (geofence);

CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  name text NOT NULL,
  code text,
  footprint geometry(Polygon, 4326),
  centroid geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buildings_campus_idx
  ON buildings (campus_id);

CREATE INDEX IF NOT EXISTS buildings_footprint_gix
  ON buildings USING gist (footprint);

CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  floor_label text NOT NULL,
  floor_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, floor_index)
);

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  name text NOT NULL,
  purpose text,
  boundary geometry(Polygon, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zones_boundary_gix
  ON zones USING gist (boundary);

CREATE TABLE IF NOT EXISTS location_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  default_confirmation_threshold integer NOT NULL DEFAULT 3,
  default_confirmation_radius_meters integer NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  building_id uuid REFERENCES buildings(id),
  floor_id uuid REFERENCES floors(id),
  zone_id uuid REFERENCES zones(id),
  category_id uuid REFERENCES location_categories(id),
  label text NOT NULL,
  point geometry(Point, 4326) NOT NULL,
  status location_status NOT NULL DEFAULT 'pending_confirmation',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  temporary_expires_at timestamptz,
  created_by uuid REFERENCES app_users(id),
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_point_gix
  ON locations USING gist (point);

CREATE INDEX IF NOT EXISTS locations_status_idx
  ON locations (status);

CREATE TABLE IF NOT EXISTS path_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id),
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid REFERENCES locations(id),
  path geometry(LineString, 4326) NOT NULL,
  floor_transition_type text,
  wheelchair_accessible boolean NOT NULL DEFAULT false,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  walk_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS path_edges_path_gix
  ON path_edges USING gist (path);

CREATE TABLE IF NOT EXISTS qr_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id),
  code_key text NOT NULL UNIQUE,
  snap_point geometry(Point, 4326) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_anchors_snap_point_gix
  ON qr_anchors USING gist (snap_point);

CREATE TABLE IF NOT EXISTS map_settings (
  id boolean PRIMARY KEY DEFAULT true,
  mapping_locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES app_users(id),
  locked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT map_settings_singleton CHECK (id)
);

INSERT INTO map_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS location_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id),
  user_id uuid NOT NULL REFERENCES app_users(id),
  distance_meters numeric(8,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, user_id)
);

CREATE TABLE IF NOT EXISTS sync_changes (
  id bigserial PRIMARY KEY,
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL,
  payload jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_changes_changed_at_idx
  ON sync_changes (changed_at, id);

CREATE TABLE IF NOT EXISTS sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id),
  device_id text,
  last_change_id bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS relay_packet_hashes (
  packet_hash text PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by_user_id uuid REFERENCES app_users(id),
  state text NOT NULL,
  rejection_reason text
);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_events_actor_idx
  ON admin_audit_events (actor_user_id, created_at DESC);
