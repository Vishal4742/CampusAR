import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createApp } from '../src/app.js';

const withApp = async (fn) => {
  const app = createApp();
  await fn(app);
};

const invoke = async (app, path, options = {}) => {
  const body = options.body ?? '';
  const request = Readable.from(body ? [body] : []);
  Object.assign(request, {
    method: options.method ?? 'GET',
    url: path,
    headers: {
      host: 'test.local',
      'content-type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  const response = {
    statusCode: 0,
    headers: {},
    rawBody: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(payload) {
      this.rawBody = payload;
    }
  };

  await app.handle(request, response);
  return {
    response,
    body: JSON.parse(response.rawBody)
  };
};

test('health and route catalog are available', async () => {
  await withApp(async (app) => {
    const health = await invoke(app, '/health');
    assert.equal(health.response.statusCode, 200);
    assert.equal(health.body.status, 'ok');

    const routes = await invoke(app, '/api/v1/routes');
    assert.equal(routes.response.statusCode, 200);
    assert.ok(routes.body.routes.length >= 29);
  });
});

test('visitor registration returns a usable access token', async () => {
  await withApp(async (app) => {
    const created = await invoke(app, '/api/v1/auth/register/visitor', {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Visitor One' })
    });

    assert.equal(created.response.statusCode, 201);
    assert.equal(created.body.user.primaryRole, 'visitor');
    assert.ok(created.body.tokens.accessToken);

    const me = await invoke(app, '/api/v1/me', {
      headers: {
        authorization: `Bearer ${created.body.tokens.accessToken}`
      }
    });

    assert.equal(me.response.statusCode, 200);
    assert.equal(me.body.user.fullName, 'Visitor One');
  });
});

test('verified registration uses OTP challenge', async () => {
  await withApp(async (app) => {
    const created = await invoke(app, '/api/v1/auth/register/verified', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Student One',
        email: 'student@oriental.ac.in',
        role: 'student',
        rollNumber: 'OCT001'
      })
    });

    assert.equal(created.response.statusCode, 201);
    assert.equal(created.body.user.verificationStatus, 'otp_pending');
    assert.ok(created.body.otp.devCode);

    const verified = await invoke(app, '/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@oriental.ac.in',
        challengeId: created.body.otp.challengeId,
        code: created.body.otp.devCode
      })
    });

    assert.equal(verified.response.statusCode, 200);
    assert.equal(verified.body.user.verificationStatus, 'verified');
    assert.ok(verified.body.tokens.accessToken);
  });
});

test('relay packet upload deduplicates packet hashes', async () => {
  await withApp(async (app) => {
    const created = await invoke(app, '/api/v1/auth/register/visitor', {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Relay User' })
    });
    const token = created.body.tokens.accessToken;

    const first = await invoke(app, '/api/v1/sync/relay-packets', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ packets: [{ packetHash: 'abc123', payload: { kind: 'confirmation' } }] })
    });
    assert.equal(first.response.statusCode, 202);
    assert.equal(first.body.results[0].result, 'accepted');

    const second = await invoke(app, '/api/v1/sync/relay-packets', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ packets: [{ packetHash: 'abc123', payload: { kind: 'confirmation' } }] })
    });
    assert.equal(second.response.statusCode, 202);
    assert.equal(second.body.results[0].result, 'duplicate');
  });
});
