import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../services/api";
import { AuthContext } from "./AuthContextValue";
import { SessionTimeoutPrompt } from "../components/SessionTimeoutPrompt";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
// How long before the session is cleared that the prompt appears.
const SESSION_WARNING_LEAD = 60 * 1000;

// Deliberately excludes "mousemove" and "scroll": those fire on their own while
// someone is reading, which would defeat the point of the timeout.
const ACTIVITY_EVENTS = ["keydown", "mousedown", "pointerdown", "touchstart", "focus"];

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
  const [idleWarning, setIdleWarning] = useState(false);
  const restartIdleTimers = useRef(() => {});

  const clearSession = useCallback(() => {
    window.localStorage.removeItem("thesishub-token");
    window.localStorage.removeItem("thesishub-user");
    setIdleWarning(false);
    setUser(null);
  }, []);

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

  useEffect(() => {
    if (!user) {
      setIdleWarning(false);
      restartIdleTimers.current = () => {};
      return undefined;
    }

    let warningId;
    let expiryId;

    const scheduleTimers = () => {
      window.clearTimeout(warningId);
      window.clearTimeout(expiryId);
      setIdleWarning(false);
      warningId = window.setTimeout(
        () => setIdleWarning(true),
        INACTIVITY_TIMEOUT - SESSION_WARNING_LEAD,
      );
      expiryId = window.setTimeout(clearSession, INACTIVITY_TIMEOUT);
    };

    // Any real interaction means the user is present, so it restarts the
    // countdown and dismisses the prompt. That also means a returning user is
    // never trapped behind the dialog.
    const handleActivity = () => scheduleTimers();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    restartIdleTimers.current = scheduleTimers;
    scheduleTimers();

    return () => {
      window.clearTimeout(warningId);
      window.clearTimeout(expiryId);
      restartIdleTimers.current = () => {};
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [user, clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      idleWarning,
      staySignedIn: () => {
        setIdleWarning(false);
        restartIdleTimers.current();
      },
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
        clearSession();
      },
    }),
    [clearSession, idleWarning, loading, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && idleWarning ? (
        <SessionTimeoutPrompt
          onStaySignedIn={value.staySignedIn}
          onSignOut={value.logout}
        />
      ) : null}
    </AuthContext.Provider>
  );
}
