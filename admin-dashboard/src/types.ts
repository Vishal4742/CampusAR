export interface HealthResponse {
  status: string;
  service?: string;
  phase?: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  fullName: string;
  rollNumber: string | null;
  designation: string | null;
  department: string | null;
  primaryRole: string;
  verificationStatus: string;
  accountStatus: string;
  contributionCooldownUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: PublicUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface MeResponse {
  user: PublicUser;
}

export interface ApiErrorBody {
  error?: string;
  code?: string;
  message?: string;
}

export type RouteKey = 'signal' | 'review' | 'operators';

export interface EventLine {
  id: string;
  tone: 'ok' | 'warn' | 'idle' | 'error';
  label: string;
  detail: string;
}
