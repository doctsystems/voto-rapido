import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAllQueries } from "../lib/query-utils";

export type UserRole = "ADMIN" | "JEFE_CAMPANA" | "JEFE_RECINTO" | "DELEGADO";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  mustChangePassword?: boolean;
  party?: { id: string; name: string; ballotOrder: number; color: string } | null;
  table?: {
    id: string;
    number: number;
    totalVoters?: number;
    school?: {
      id: string;
      name: string;
      code?: number;
    } | null;
  } | null;
  school?: {
    id: string;
    name: string;
    code?: number;
  } | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        // Limpiar cache completamente cuando cambia el usuario
        clearAllQueries();
        set({ token, user, isAuthenticated: true });
      },
      updateUser: (user) => set((state) => ({ ...state, user })),
      logout: () => {
        // Limpiar cache completamente al hacer logout
        clearAllQueries();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: "quicktally-auth" },
  ),
);

