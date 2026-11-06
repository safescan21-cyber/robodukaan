"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase-browser";
import type { Profile } from "@/lib/types";
import { postAsUser } from "@/lib/api-client";

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data?.is_blocked) {
      await getSupabase().auth.signOut();
      setProfile(null);
      window.location.replace(`${/^\/(hi|ur|fr|ko|ja|zh)(\/|$)/.test(window.location.pathname) ? window.location.pathname.split("/").slice(0, 2).join("/") : ""}/login?blocked=1`);
      return;
    }
    setProfile((data as Profile) ?? null);
    // Customers who confirmed by clicking the email link still get their welcome email (sent once).
    if (data && !data.welcome_sent_at) postAsUser("/api/email/welcome");
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Don't await Supabase calls inside this callback (it can deadlock).
      setTimeout(() => loadProfile(next?.user.id), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await getSupabase().auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
