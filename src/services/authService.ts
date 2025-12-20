import { apiClient } from "./api";
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from "../types/auth.types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiClient.postFormData("/auth/login", credentials, false);
    return data;
  },

  async register(registerData: RegisterData): Promise<void> {
    await apiClient.postFormData("/auth/register", registerData, false);
  },

  async logout(): Promise<void> {
    try {
      // Backend expects { userId, authToken, refreshToken } but we can't access refreshToken if it's HttpOnly.
      // We'll send an empty object and rely on the backend potentially handling it or just clearing local state.
      await apiClient.post("/auth/logout", {});
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const data = await apiClient.get("/auth/refresh/token");
    return data;
  },
};
