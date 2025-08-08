import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  loginMethod?: 'password' | 'code';
}

export interface VerifyRequest {
  email: string;
  code: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  department: string;
  password?: string;
  confirmPassword?: string;
}

export const auth = {
  async login(data: LoginRequest) {
    const response = await apiRequest("POST", "/api/auth/login", data);
    return response.json();
  },

  async verify(data: VerifyRequest) {
    const response = await apiRequest("POST", "/api/auth/verify", data);
    return response.json();
  },

  async register(data: RegisterRequest) {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
  },

  async logout() {
    const response = await apiRequest("POST", "/api/auth/logout");
    return response.json();
  },

  async getCurrentUser() {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  }
};
