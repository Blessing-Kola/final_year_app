import { useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";
import { AuthContext } from "./AuthContextValue";

const normalizeUser = (user) => {
  if (!user) return null;

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ...user,
    name: user.name || fullName || user.email || "User",
  };
};

const readStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const storedUser = window.localStorage.getItem("thesishub-user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeUser(readStoredUser()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = window.localStorage.getItem("thesishub-token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        const normalizedUser = normalizeUser(response.user);
        setUser(normalizedUser);
        window.localStorage.setItem(
          "thesishub-user",
          JSON.stringify(normalizedUser),
        );
      } catch {
        window.localStorage.removeItem("thesishub-token");
        window.localStorage.removeItem("thesishub-user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (credentials) => {
        const response = await authApi.login(credentials);
        const normalizedUser = normalizeUser(response.user);
        window.localStorage.setItem("thesishub-token", response.token);
        window.localStorage.setItem(
          "thesishub-user",
          JSON.stringify(normalizedUser),
        );
        setUser(normalizedUser);
        return { ...response, user: normalizedUser };
      },
      register: async (payload) => {
        const response = await authApi.register(payload);
        return { ...response, user: normalizeUser(response.user) };
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore logout errors and clear local state
        }
        window.localStorage.removeItem("thesishub-token");
        window.localStorage.removeItem("thesishub-user");
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
