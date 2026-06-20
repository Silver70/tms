/// <reference types="vite/client" />
import axios from 'redaxios';
import type {
  LoginRequest,
  RegisterRequest,
  SessionResponse,
  User,
} from './types';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

/** Browser-side client. `withCredentials` sends/receives the httpOnly auth cookies. */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export async function loginRequest(body: LoginRequest): Promise<User> {
  const { data } = await api.post<SessionResponse>('/auth/login', body);
  return data.user;
}

export async function registerRequest(body: RegisterRequest): Promise<User> {
  const { data } = await api.post<SessionResponse>('/auth/register', body);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

/** redaxios rejects with the response object on non-2xx. */
interface RejectedResponse {
  status?: number;
  data?: { message?: string | string[] };
}

export function getErrorStatus(err: unknown): number | undefined {
  return (err as RejectedResponse)?.status;
}

export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message = (err as RejectedResponse)?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  if (typeof message === 'string') return message;
  return fallback;
}
