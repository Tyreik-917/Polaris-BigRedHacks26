"use client";

import {
  clearAuthSession,
  getAuthSession,
  setDemoAuthSession,
  type AuthSession,
} from "@/lib/client/auth-session";
import { useCallback, useEffect, useState } from "react";

export function useAuthSession() {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessionState(getAuthSession());
    setHydrated(true);
  }, []);

  const signInDemo = useCallback((displayName: string) => {
    setDemoAuthSession(displayName);
    setSessionState(getAuthSession());
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    setSessionState(null);
  }, []);

  return {
    session,
    hydrated,
    signInDemo,
    signOut,
    isSignedIn: Boolean(session),
  };
}
