import { create } from "zustand";

interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
  role?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setBalance: (balance: number) => void;
  logout: () => void;
  hydrate: () => void;
}

const getInitialAuthState = (): { user: User | null; token: string | null } => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { user, token };
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  return { user: null, token: null };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialAuthState(),
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  setBalance: (balance) =>
    set((state) => ({
      user: state.user ? { ...state.user, balance } : null,
    })),
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  },
}));
