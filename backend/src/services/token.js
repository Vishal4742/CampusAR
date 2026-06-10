import { createHmac, timingSafeEqual } from 'node:crypto';

const base64url = (input) => Buffer.from(input).toString('base64url');

const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export const createTokenService = ({ secret, accessTokenSeconds, refreshTokenSeconds }) => {
  const issue = ({ userId, role, type }) => {
    const ttl = type === 'refresh' ? refreshTokenSeconds : accessTokenSeconds;
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
      sub: userId,
      role,
      type,
      iat: now,
      exp: now + ttl
    }));
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${sign(unsigned, secret)}`;
  };

  const verify = (token, expectedType = 'access') => {
    const parts = token?.split('.') ?? [];
    if (parts.length !== 3) {
      return null;
    }

    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = sign(unsigned, secret);
    const actual = parts[2];

    if (expected.length !== actual.length) {
      return null;
    }

    const matches = timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    if (!matches) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now || payload.type !== expectedType) {
      return null;
    }

    return payload;
  };

  return {
    issuePair(user) {
      return {
        accessToken: issue({ userId: user.id, role: user.primaryRole, type: 'access' }),
        refreshToken: issue({ userId: user.id, role: user.primaryRole, type: 'refresh' }),
        tokenType: 'Bearer',
        expiresIn: accessTokenSeconds
      };
    },
    verify
  };
};
