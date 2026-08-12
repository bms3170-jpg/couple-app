"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext =
  createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
  });

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    session,
    setSession,
  ] = useState<Session | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {
          if (!mounted) {
            return;
          }

          setSession(
            nextSession
          );

          setLoading(false);
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        session,

        user:
          session?.user ??
          null,

        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(
    AuthContext
  );
}