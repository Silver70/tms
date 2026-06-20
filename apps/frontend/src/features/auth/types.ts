export type Role =
  | 'visitor'
  | 'hotel_staff'
  | 'ferry_staff'
  | 'park_staff'
  | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Auth endpoints return only the user; tokens live in httpOnly cookies. */
export interface SessionResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
