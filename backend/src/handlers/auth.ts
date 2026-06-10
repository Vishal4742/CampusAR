import type { FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { badRequest, conflict, unauthorized } from '../http/errors.js';
import { isVerifiedRole, USER_ROLES } from '../domain/roles.js';
import type { Services } from '../services/index.js';
import type { User } from '../types.js';

export const visitorRegistrationSchema = Type.Object({
  fullName: Type.String({ minLength: 1 }),
  email: Type.Optional(Type.String())
});

export const verifiedRegistrationSchema = Type.Object({
  fullName: Type.String({ minLength: 1 }),
  email: Type.String({ minLength: 3 }),
  role: Type.Optional(Type.String()),
  rollNumber: Type.Optional(Type.String()),
  designation: Type.Optional(Type.String()),
  department: Type.Optional(Type.String())
});

export const otpRequestSchema = Type.Object({ email: Type.String({ minLength: 3 }) });
export const otpVerifySchema = Type.Object({
  email: Type.String({ minLength: 3 }),
  code: Type.String({ minLength: 1 }),
  challengeId: Type.Optional(Type.String())
});
export const loginSchema = Type.Object({
  email: Type.Optional(Type.String()),
  userId: Type.Optional(Type.String())
});
export const refreshSchema = Type.Object({ refreshToken: Type.String({ minLength: 1 }) });

type Body = Record<string, unknown>;

const text = (body: Body, key: string): string => {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${key} is required`);
  }
  return value.trim();
};

const optionalText = (body: Body, key: string): string | null => {
  const value = body[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

const serializeSession = async (services: Services, user: User) => ({
  user: services.store.publicUser(user),
  tokens: await services.tokens.issuePair(user)
});

const getBearerToken = (request: FastifyRequest): string | null => {
  const header = request.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

export const requireUser = async (request: FastifyRequest, services: Services): Promise<User> => {
  const payload = await services.tokens.verify(getBearerToken(request), 'access');
  if (!payload) {
    throw unauthorized();
  }

  const user = services.store.findUserById(payload.sub);
  if (!user) {
    throw unauthorized('Authenticated user no longer exists');
  }

  return user;
};

export const registerVisitor = async (services: Services, body: Body) => {
  const user = services.store.createUser({
    fullName: text(body, 'fullName'),
    email: optionalText(body, 'email'),
    primaryRole: USER_ROLES.VISITOR,
    verificationStatus: 'not_required'
  });
  return serializeSession(services, user);
};

export const registerVerified = (services: Services, body: Body) => {
  const fullName = text(body, 'fullName');
  const email = text(body, 'email').toLowerCase();
  const role = typeof body.role === 'string' ? body.role : USER_ROLES.STUDENT;

  if (!isVerifiedRole(role)) {
    throw badRequest('role must be student, staff, or faculty');
  }

  if (services.config.collegeEmailDomain && !email.endsWith(`@${services.config.collegeEmailDomain}`)) {
    throw badRequest(`email must use ${services.config.collegeEmailDomain}`, 'invalid_college_email');
  }

  if (services.store.findUserByEmail(email)) {
    throw conflict('email is already registered', 'email_exists');
  }

  const user = services.store.createUser({
    fullName,
    email,
    rollNumber: optionalText(body, 'rollNumber'),
    designation: optionalText(body, 'designation'),
    department: optionalText(body, 'department'),
    primaryRole: role,
    verificationStatus: 'otp_pending'
  });
  const { otp, code } = services.store.createOtp({ userId: user.id, email });

  return {
    user: services.store.publicUser(user),
    otp: {
      challengeId: otp.id,
      expiresAt: otp.expiresAt,
      delivery: services.config.collegeEmailDomain ? 'provider_pending' : 'dev_response',
      devCode: services.config.environment === 'production' ? undefined : code
    }
  };
};

export const requestOtp = (services: Services, body: Body) => {
  const email = text(body, 'email').toLowerCase();
  const user = services.store.findUserByEmail(email);
  if (!user) {
    throw unauthorized('No account exists for that email');
  }
  const { otp, code } = services.store.createOtp({ userId: user.id, email });
  return {
    challengeId: otp.id,
    expiresAt: otp.expiresAt,
    delivery: services.config.collegeEmailDomain ? 'provider_pending' : 'dev_response',
    devCode: services.config.environment === 'production' ? undefined : code
  };
};

export const verifyOtp = async (services: Services, body: Body) => {
  const email = text(body, 'email').toLowerCase();
  const otp = services.store.verifyOtp({
    email,
    code: text(body, 'code'),
    challengeId: optionalText(body, 'challengeId') ?? undefined
  });
  if (!otp) {
    throw unauthorized('OTP is invalid or expired');
  }

  const user = services.store.findUserById(otp.userId);
  if (!user) {
    throw unauthorized('OTP account no longer exists');
  }

  services.store.updateUser(user, { verificationStatus: 'verified' });
  return serializeSession(services, user);
};

export const login = async (services: Services, body: Body) => {
  const email = optionalText(body, 'email');
  const userId = optionalText(body, 'userId');
  const user = email ? services.store.findUserByEmail(email) : userId ? services.store.findUserById(userId) : null;
  if (!user) {
    throw unauthorized('Unknown account');
  }
  if (user.verificationStatus === 'otp_pending') {
    throw unauthorized('OTP verification is required before login');
  }
  return serializeSession(services, user);
};

export const refresh = async (services: Services, body: Body) => {
  const payload = await services.tokens.verify(text(body, 'refreshToken'), 'refresh');
  if (!payload) {
    throw unauthorized('Refresh token is invalid or expired');
  }
  const user = services.store.findUserById(payload.sub);
  if (!user) {
    throw unauthorized('Refresh token user no longer exists');
  }
  return serializeSession(services, user);
};
