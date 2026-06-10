export const config = Object.freeze({
  environment: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.CAMPUSAR_JWT_SECRET ?? 'dev-only-change-before-production',
  accessTokenSeconds: Number.parseInt(process.env.CAMPUSAR_ACCESS_TOKEN_SECONDS ?? '3600', 10),
  refreshTokenSeconds: Number.parseInt(process.env.CAMPUSAR_REFRESH_TOKEN_SECONDS ?? '604800', 10),
  collegeEmailDomain: process.env.CAMPUSAR_COLLEGE_EMAIL_DOMAIN ?? 'oriental.ac.in',
  seedAdminEmail: process.env.CAMPUSAR_SEED_ADMIN_EMAIL ?? 'vg8904937@gmail.com',
  seedAdminName: process.env.CAMPUSAR_SEED_ADMIN_NAME ?? 'CampusAR Seed Admin'
});
