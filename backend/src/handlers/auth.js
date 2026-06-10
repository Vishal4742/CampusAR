import { badRequest, conflict, unauthorized } from '../http/errors.js';
import { isVerifiedRole, USER_ROLES } from '../domain/roles.js';

const requireText = (body, key) => {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${key} is required`);
  }
  return value.trim();
};

const serializeSession = (services, user) => ({
  user: services.store.publicUser(user),
  tokens: services.tokens.issuePair(user)
});

const getBearerToken = (request) => {
  const header = request.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
};

export const requireUser = ({ request, services }) => {
  const token = getBearerToken(request);
  const payload = services.tokens.verify(token, 'access');
  if (!payload) {
    throw unauthorized();
  }

  const user = services.store.findUserById(payload.sub);
  if (!user) {
    throw unauthorized('Authenticated user no longer exists');
  }

  return user;
};

export const registerVisitor = ({ body, services }) => {
  const fullName = requireText(body, 'fullName');
  const user = services.store.createUser({
    fullName,
    email: body.email ?? null,
    primaryRole: USER_ROLES.VISITOR,
    verificationStatus: 'not_required'
  });

  return {
    statusCode: 201,
    body: serializeSession(services, user)
  };
};

export const registerVerified = ({ body, services }) => {
  const fullName = requireText(body, 'fullName');
  const email = requireText(body, 'email').toLowerCase();
  const role = body.role ?? USER_ROLES.STUDENT;

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
    rollNumber: body.rollNumber ?? null,
    designation: body.designation ?? null,
    department: body.department ?? null,
    primaryRole: role,
    verificationStatus: 'otp_pending'
  });
  const { otp, code } = services.store.createOtp({ userId: user.id, email });

  return {
    statusCode: 201,
    body: {
      user: services.store.publicUser(user),
      otp: {
        challengeId: otp.id,
        expiresAt: otp.expiresAt,
        delivery: services.config.collegeEmailDomain ? 'provider_pending' : 'dev_response',
        devCode: services.config.environment === 'production' ? undefined : code
      },
      openQuestions: services.config.collegeEmailDomain ? [] : ['CAMPUSAR_COLLEGE_EMAIL_DOMAIN is not configured']
    }
  };
};

export const requestOtp = ({ body, services }) => {
  const email = requireText(body, 'email').toLowerCase();
  const user = services.store.findUserByEmail(email);
  if (!user) {
    throw unauthorized('No account exists for that email');
  }

  const { otp, code } = services.store.createOtp({ userId: user.id, email });
  return {
    statusCode: 201,
    body: {
      challengeId: otp.id,
      expiresAt: otp.expiresAt,
      delivery: services.config.collegeEmailDomain ? 'provider_pending' : 'dev_response',
      devCode: services.config.environment === 'production' ? undefined : code
    }
  };
};

export const verifyOtp = ({ body, services }) => {
  const email = requireText(body, 'email').toLowerCase();
  const code = requireText(body, 'code');
  const otp = services.store.verifyOtp({ email, code, challengeId: body.challengeId });

  if (!otp) {
    throw unauthorized('OTP is invalid or expired');
  }

  const user = services.store.findUserById(otp.userId);
  if (!user) {
    throw unauthorized('OTP account no longer exists');
  }

  services.store.updateUser(user, { verificationStatus: 'verified' });
  return { body: serializeSession(services, user) };
};

export const login = ({ body, services }) => {
  const email = body.email ? String(body.email).toLowerCase() : null;
  const user = email ? services.store.findUserByEmail(email) : services.store.findUserById(body.userId);
  if (!user) {
    throw unauthorized('Unknown account');
  }
  if (user.verificationStatus === 'otp_pending') {
    throw unauthorized('OTP verification is required before login');
  }

  return { body: serializeSession(services, user) };
};

export const refresh = ({ body, services }) => {
  const token = requireText(body, 'refreshToken');
  const payload = services.tokens.verify(token, 'refresh');
  if (!payload) {
    throw unauthorized('Refresh token is invalid or expired');
  }

  const user = services.store.findUserById(payload.sub);
  if (!user) {
    throw unauthorized('Refresh token user no longer exists');
  }

  return { body: serializeSession(services, user) };
};

export const me = (context) => {
  const user = requireUser(context);
  return { body: { user: context.services.store.publicUser(user) } };
};

export const deleteMe = (context) => {
  const user = requireUser(context);
  context.services.store.deleteUser(user);
  return { body: { deleted: true, userId: user.id } };
};
