"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: number | string;
  email: string;
  name: string;
  role: "CUSTOMER" | "STAFF" | string;
  loyaltyPoints?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,

      setSession: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "brewLite-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);