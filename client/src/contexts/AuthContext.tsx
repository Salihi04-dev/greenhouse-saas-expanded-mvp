import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProfile, isSupabaseConfigured, signIn as supabaseSignIn, signOut as supabaseSignOut, supabase, type AppRole, type Profile } from "@/lib/supabase";

type AuthContextValue = { configured: boolean; loading: boolean; sessionUserId: string | null; profile: Profile | null; profileError: string | null; role: AppRole | "demo"; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    let profileRequest = 0;
    const loadProfile = async (userId: string | null) => {
      const request = ++profileRequest;
      if (!userId) { if (active) { setProfile(null); setProfileError(null); } return; }
      try {
        const nextProfile = await getProfile(userId);
        if (active && request === profileRequest) { setProfile(nextProfile); setProfileError(nextProfile ? null : "No public.profiles row exists for this authenticated user."); }
      } catch (error) {
        if (active && request === profileRequest) { setProfile(null); setProfileError(error instanceof Error ? error.message : "The profile could not be loaded from Supabase."); }
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!error) {
        const userId = data.session?.user.id ?? null;
        setSessionUserId(userId);
        void loadProfile(userId);
      }
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const userId = session?.user.id ?? null;
      setSessionUserId(userId);
      if (!userId) { setProfile(null); setProfileError(null); return; }
      window.setTimeout(() => { if (active && event !== "SIGNED_OUT") void loadProfile(userId); }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [configured]);

  const value = useMemo<AuthContextValue>(() => ({
    configured, loading, sessionUserId, profile, profileError,
    role: profile?.role ?? (configured ? "worker" : "demo"),
    signIn: async (email, password) => { await supabaseSignIn(email, password); },
    signOut: async () => { await supabaseSignOut(); setSessionUserId(null); setProfile(null); setProfileError(null); },
  }), [configured, loading, sessionUserId, profile, profileError]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
