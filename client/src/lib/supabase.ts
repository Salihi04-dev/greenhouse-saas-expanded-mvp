import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "worker" | "manager" | "admin";
export type Profile = { id: string; full_name: string; role: AppRole; created_at: string };

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const isSupabaseConfigured = () => Boolean(supabase);

export async function getProfile(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  return result.data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<{ session: Session | null; profile: Profile | null }> {
  if (!supabase) return { session: null, profile: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const profile = data.session ? await getProfile(data.session.user.id) : null;
  return { session: data.session, profile };
}
