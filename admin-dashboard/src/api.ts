import type { ApiErrorBody, HealthResponse, LoginResponse, MeResponse } from './types';

export const DEFAULT_API_BASE = 'http://localhost:8080';
export const API_BASE_STORAGE_KEY = 'campusar.admin.apiBase';
export const TOKEN_STORAGE_KEY = 'campusar.admin.accessToken';
export const EMAIL_STORAGE_KEY = 'campusar.admin.email';

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: ApiErrorBody | null;

  constructor(status: number, statusText: string, body: ApiErrorBody | null) {
    super(body?.message ?? body?.error ?? `${status} ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
};

const request = async <T>(
  apiBase: string,
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');

  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (options.token) {
    headers.set('authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
    ...options,
    headers
  });
  const body = await parseJson<T | ApiErrorBody>(response);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, body as ApiErrorBody);
  }

  return body as T;
};

export const login = (apiBase: string, email: string): Promise<LoginResponse> => {
  return request<LoginResponse>(apiBase, '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const getHealth = (apiBase: string): Promise<HealthResponse> => {
  return request<HealthResponse>(apiBase, '/health');
};

export const getMe = (apiBase: string, token: string): Promise<MeResponse> => {
  return request<MeResponse>(apiBase, '/api/v1/me', { token });
};
