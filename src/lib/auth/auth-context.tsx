"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  checkAuth as apiCheckAuth,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "./api";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    apiCheckAuth().then((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated && process.env.NEXT_PUBLIC_MOCK_USER_ID) {
        setEmail("demo@greedyeye.local");
      }
      setIsLoading(false);
    });
  }, []);

  async function login(userEmail: string, password: string) {
    const res = await apiLogin(userEmail, password);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message || "Invalid credentials");
    }
    const body = await res.json().catch(() => ({}));
    setEmail((body as { email?: string }).email || userEmail);
    setIsAuthenticated(true);
  }

  async function register(userEmail: string, password: string) {
    const res = await apiRegister(userEmail, password);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message || "Registration failed");
    }
    const body = await res.json().catch(() => ({}));
    setEmail((body as { email?: string }).email || userEmail);
    setIsAuthenticated(true);
  }

  async function logout() {
    await apiLogout();
    setIsAuthenticated(false);
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
