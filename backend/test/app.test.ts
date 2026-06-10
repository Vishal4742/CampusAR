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
