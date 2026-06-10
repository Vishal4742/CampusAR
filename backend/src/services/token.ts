import { SignJWT, jwtVerify } from 'jose';
import type { User, UserRole } from '../types.js';
import { USER_ROLES } from '../domain/roles.js';

interface TokenPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

const userRoles = new Set<UserRole>(Object.values(USER_ROLES));

const isUserRole = (value: unknown): value is UserRole => typeof value === 'string' && userRoles.has(value as UserRole);

export const createTokenService = ({
  secret,
  accessTokenSeconds,
  refreshTokenSeconds
}: {
  secret: string;
  accessTokenSeconds: number;
  refreshTokenSeconds: number;
}) => {
  const key = new TextEncoder().encode(secret);

  const issue = async ({ userId, role, type }: { userId: string; role: UserRole; type: 'access' | 'refresh' }): Promise<string> => {
    const ttl = type === 'refresh' ? refreshTokenSeconds : accessTokenSeconds;
    return new SignJWT({ role, type })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${ttl}s`)
      .sign(key);
  };

  const verify = async (token: string | undefined | null, expectedType: 'access' | 'refresh'): Promise<TokenPayload | null> => {
    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
      if (payload.type !== expectedType || typeof payload.sub !== 'string' || !isUserRole(payload.role)) {
        return null;
      }

      return {
        sub: payload.sub,
        role: payload.role,
        type: expectedType,
        iat: Number(payload.iat ?? 0),
        exp: Number(payload.exp ?? 0)
      };
    } catch {
      return null;
    }
  };

  return {
    async issuePair(user: User) {
      return {
        accessToken: await issue({ userId: user.id, role: user.primaryRole, type: 'access' }),
        refreshToken: await issue({ userId: user.id, role: user.primaryRole, type: 'refresh' }),
        tokenType: 'Bearer',
        expiresIn: accessTokenSeconds
      };
    },
    verify
  };
};
