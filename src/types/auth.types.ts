import type { User } from "./user.types";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  email?: string; // Email is not returned by login/refresh anymore
  accessToken: string;
  refreshToken?: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}
