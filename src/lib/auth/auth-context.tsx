"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkAuth as apiCheckAuth,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "./api";
import { setUnauthenticatedHandler } from "@/lib/api/client";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  // From psina Verify; role-gated UI only — the backend enforces the real check.
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUnauthenticatedHandler(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    apiCheckAuth().then(({ authenticated, email: verifiedEmail, roles }) => {
      setIsAuthenticated(authenticated);
      setEmail(verifiedEmail);
      setIsAdmin(roles.includes("admin"));
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
    // Roles come from Verify, not the login response.
    apiCheckAuth().then(({ roles }) => setIsAdmin(roles.includes("admin")));
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
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, email, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
