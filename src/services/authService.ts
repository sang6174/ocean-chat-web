import { apiClient } from "./api";
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from "../types/auth.types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiClient.postFormData("/v1/auth/login", credentials, false);
    return data;
  },

  async register(registerData: RegisterData): Promise<void> {
    await apiClient.postFormData("/v1/auth/register", registerData, false);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/v1/auth/logout", {});
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const data = await apiClient.post("/v1/auth/refresh", {}, false);
    return data;
  },
};
