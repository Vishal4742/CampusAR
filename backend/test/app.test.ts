import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createEmailService } from '../src/services/email.js';

test('health and route catalog are available', async () => {
  const app = await createApp();
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().status, 'ok');

  const routes = await app.inject({ method: 'GET', url: '/api/v1/routes' });
  assert.equal(routes.statusCode, 200);
  assert.ok(routes.json().routes.length >= 29);
});

test('visitor registration returns a usable access token', async () => {
  const app = await createApp();
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/visitor',
    payload: { fullName: 'Visitor One' }
  });

  assert.equal(created.statusCode, 201);
  const createdBody = created.json();
  assert.equal(createdBody.user.primaryRole, 'visitor');
  assert.ok(createdBody.tokens.accessToken);

  const me = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { authorization: `Bearer ${createdBody.tokens.accessToken}` }
  });

  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.fullName, 'Visitor One');
});

test('verified registration uses OTP challenge', async () => {
  const app = await createApp();
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/verified',
    payload: {
      fullName: 'Student One',
      email: 'student@oriental.ac.in',
      role: 'student',
      rollNumber: 'OCT001'
    }
  });

  assert.equal(created.statusCode, 201);
  const createdBody = created.json();
  assert.equal(createdBody.user.verificationStatus, 'otp_pending');
  assert.ok(createdBody.otp.devCode);

  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/otp/verify',
    payload: {
      email: 'student@oriental.ac.in',
      challengeId: createdBody.otp.challengeId,
      code: createdBody.otp.devCode
    }
  });

  assert.equal(verified.statusCode, 200);
  assert.equal(verified.json().user.verificationStatus, 'verified');
});

test('relay packet upload deduplicates packet hashes', async () => {
  const app = await createApp();
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/visitor',
    payload: { fullName: 'Relay User' }
  });
  const token = created.json().tokens.accessToken;

  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/sync/relay-packets',
    headers: { authorization: `Bearer ${token}` },
    payload: { packets: [{ packetHash: 'abc123', payload: { kind: 'confirmation' } }] }
  });
  assert.equal(first.statusCode, 202);
  assert.equal(first.json().results[0].result, 'accepted');

  const second = await app.inject({
    method: 'POST',
    url: '/api/v1/sync/relay-packets',
    headers: { authorization: `Bearer ${token}` },
    payload: { packets: [{ packetHash: 'abc123', payload: { kind: 'confirmation' } }] }
  });
  assert.equal(second.statusCode, 202);
  assert.equal(second.json().results[0].result, 'duplicate');
});

test('resend email service posts OTP email payload with idempotency key', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const email = createEmailService({
    environment: 'production',
    emailProvider: 'resend',
    resendApiKey: 're_test_key',
    resendFromEmail: 'CampusAR <noreply@example.com>'
  }, async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ id: 'email_123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  const result = await email.sendOtpEmail({
    to: 'student@oriental.ac.in',
    code: '123456',
    challengeId: 'challenge_123',
    purpose: 'email_verification',
    expiresAt: '2026-06-11T10:00:00.000Z'
  });

  assert.equal(result.delivery, 'email_sent');
  assert.equal(result.provider, 'resend');
  assert.equal(result.providerMessageId, 'email_123');
  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, 'https://api.resend.com/emails');
  assert.equal(call.init.method, 'POST');
  assert.equal((call.init.headers as Record<string, string>).Authorization, 'Bearer re_test_key');
  assert.equal((call.init.headers as Record<string, string>)['Idempotency-Key'], 'challenge_123');

  const body = JSON.parse(String(call.init.body)) as { from: string; to: string[]; subject: string; text: string };
  assert.equal(body.from, 'CampusAR <noreply@example.com>');
  assert.deepEqual(body.to, ['student@oriental.ac.in']);
  assert.equal(body.subject, 'Your CampusAR verification code');
  assert.match(body.text, /123456/);
});

test('visitor users cannot submit Phase 2 mapping fingerprints', async () => {
  const app = await createApp();
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/visitor',
    payload: { fullName: 'Visitor Mapper Attempt' }
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/fingerprint-sessions',
    headers: { authorization: `Bearer ${created.json().tokens.accessToken}` },
    payload: {
      campusId: 'oct-bhopal',
      kind: 'wifi_rssi',
      coordinateStatus: 'provisional',
      deviceModel: 'Redmi Note 10 Pro'
    }
  });

  assert.equal(response.statusCode, 403);
});

test('admin approves Phase 2 sensor fingerprints for Android cache reads', async () => {
  const app = await createApp();
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'vg8904937@gmail.com' }
  });
  assert.equal(login.statusCode, 200);
  const token = login.json().tokens.accessToken;

  const createdSession = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/fingerprint-sessions',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      kind: 'wifi_rssi',
      buildingId: 'provisional-main-block',
      floorId: 'ground',
      coordinateStatus: 'provisional',
      deviceModel: 'Redmi Note 10 Pro',
      androidSdk: '35',
      position: {
        type: 'Point',
        coordinates: [77.5019383, 23.2462927],
        source: 'provisional_google_maps_pin'
      }
    }
  });
  assert.equal(createdSession.statusCode, 201);
  const session = createdSession.json().session;

  const submitted = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/fingerprints/wifi',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      sessionId: session.id,
      collectedAt: '2026-06-11T10:00:00.000Z',
      readings: [{
        bssidHash: 'sha256:test-access-point',
        ssidLabel: 'redacted',
        rssiDbm: -58,
        frequencyMhz: 2412,
        scanAgeMs: 120
      }]
    }
  });
  assert.equal(submitted.statusCode, 202);
  assert.equal(submitted.json().fingerprint.verificationStatus, 'pending_admin_review');

  const magnetic = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/fingerprints/magnetic',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      sessionId: session.id,
      collectedAt: '2026-06-11T10:00:01.000Z',
      samples: [{
        magneticXMicroTesla: 12.1,
        magneticYMicroTesla: -4.2,
        magneticZMicroTesla: 38.9,
        magnitudeMicroTesla: 41.0,
        quality: 'calibrated'
      }]
    }
  });
  assert.equal(magnetic.statusCode, 202);

  const barometer = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/barometer-samples',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      sessionId: session.id,
      collectedAt: '2026-06-11T10:00:02.000Z',
      pressureHpa: 944.321,
      relativeAltitudeMeters: 0
    }
  });
  assert.equal(barometer.statusCode, 202);

  const hiddenBeforeApproval = await app.inject({ method: 'GET', url: '/api/v1/map/fingerprints/wifi' });
  assert.equal(hiddenBeforeApproval.statusCode, 200);
  assert.equal(hiddenBeforeApproval.json().fingerprints.length, 0);

  const reviewQueue = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/fingerprint-sessions',
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(reviewQueue.statusCode, 200);
  assert.equal(reviewQueue.json().sessions.length, 1);
  assert.equal(reviewQueue.json().sessions[0].sampleCounts.wifi, 1);

  const approved = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/fingerprint-sessions/${session.id}/approve`,
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().session.verificationStatus, 'verified');

  const visible = await app.inject({ method: 'GET', url: '/api/v1/map/fingerprints/wifi?buildingId=provisional-main-block' });
  assert.equal(visible.statusCode, 200);
  assert.equal(visible.json().fingerprints.length, 1);
  assert.equal(visible.json().fingerprints[0].verificationStatus, 'verified');
  assert.equal(visible.json().fingerprints[0].readings[0].bssidHash, 'sha256:test-access-point');

  const visibleMagnetic = await app.inject({ method: 'GET', url: '/api/v1/map/fingerprints/magnetic?buildingId=provisional-main-block' });
  assert.equal(visibleMagnetic.statusCode, 200);
  assert.equal(visibleMagnetic.json().fingerprints.length, 1);
  assert.equal(visibleMagnetic.json().fingerprints[0].samples[0].quality, 'calibrated');

  const floorProfiles = await app.inject({ method: 'GET', url: '/api/v1/map/floor-profiles?buildingId=provisional-main-block' });
  assert.equal(floorProfiles.statusCode, 200);
  assert.equal(floorProfiles.json().floorProfiles.length, 1);
  assert.equal(floorProfiles.json().floorProfiles[0].sampleCount, 1);

  const manifest = await app.inject({ method: 'GET', url: '/api/v1/sync/manifest' });
  assert.equal(manifest.statusCode, 200);
  assert.equal(manifest.json().counts.wifiFingerprints, 1);
  assert.equal(manifest.json().counts.magneticFingerprints, 1);
  assert.equal(manifest.json().counts.floorProfiles, 1);
});

test('QR anchors are published only after admin approval', async () => {
  const app = await createApp();
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'vg8904937@gmail.com' }
  });
  assert.equal(login.statusCode, 200);
  const token = login.json().tokens.accessToken;

  const proposed = await app.inject({
    method: 'POST',
    url: '/api/v1/mapping/qr-anchors',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      campusId: 'oct-bhopal',
      buildingId: 'provisional-main-block',
      floorId: 'ground',
      codeKey: 'oct-ground-entry-001',
      coordinateStatus: 'provisional',
      snapPoint: {
        type: 'Point',
        coordinates: [77.5019383, 23.2462927],
        source: 'provisional_google_maps_pin'
      }
    }
  });
  assert.equal(proposed.statusCode, 201);
  const qrAnchor = proposed.json().qrAnchor;
  assert.equal(qrAnchor.verificationStatus, 'pending_admin_review');

  const hiddenBeforeApproval = await app.inject({ method: 'GET', url: '/api/v1/map/qr-anchors' });
  assert.equal(hiddenBeforeApproval.statusCode, 200);
  assert.equal(hiddenBeforeApproval.json().qrAnchors.length, 0);

  const adminQueue = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/qr-anchors',
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(adminQueue.statusCode, 200);
  assert.equal(adminQueue.json().qrAnchors.length, 1);

  const approved = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/qr-anchors/${qrAnchor.id}/approve`,
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().qrAnchor.active, true);

  const visible = await app.inject({ method: 'GET', url: '/api/v1/map/qr-anchors' });
  assert.equal(visible.statusCode, 200);
  assert.equal(visible.json().qrAnchors.length, 1);
  assert.equal(visible.json().qrAnchors[0].codeKey, 'oct-ground-entry-001');
});
