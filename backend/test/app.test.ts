import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';

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
