import 'dotenv/config';

const intEnv = (key: string, fallback: number): number => {
  const value = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
};

export const config = Object.freeze({
  environment: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: intEnv('PORT', 8080),
  jwtSecret: process.env.CAMPUSAR_JWT_SECRET ?? 'dev-only-change-before-production',
  accessTokenSeconds: intEnv('CAMPUSAR_ACCESS_TOKEN_SECONDS', 3600),
  refreshTokenSeconds: intEnv('CAMPUSAR_REFRESH_TOKEN_SECONDS', 604800),
  collegeEmailDomain: process.env.CAMPUSAR_COLLEGE_EMAIL_DOMAIN ?? 'oriental.ac.in',
  seedAdminEmail: process.env.CAMPUSAR_SEED_ADMIN_EMAIL ?? 'vg8904937@gmail.com',
  seedAdminName: process.env.CAMPUSAR_SEED_ADMIN_NAME ?? 'CampusAR Seed Admin',
  databaseUrl: process.env.DATABASE_URL ?? '',
  emailProvider: (process.env.EMAIL_PROVIDER ?? 'dev').toLowerCase(),
  resendApiKey: process.env.RESEND_API_KEY ?? process.env.EMAIL_PROVIDER_API_KEY ?? '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? 'CampusAR <onboarding@resend.dev>'
});
