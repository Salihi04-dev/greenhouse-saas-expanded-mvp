import { useState } from "react";
import { Droplets, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import "./index.css";

function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return <main className="auth-screen"><section className="auth-card"><div className="auth-mark"><Droplets size={22} /></div><span className="eyebrow">GREENFIELDS · FARM OPERATIONS</span><h1>Welcome back.</h1><p className="intro-copy">Sign in to continue to your operational workspace.</p><form onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); try { await signIn(email, password); toast.success("Signed in"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to sign in"); } finally { setSubmitting(false); } }}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><button className="primary-button auth-submit" disabled={submitting}><LogIn size={17} />{submitting ? "Signing in…" : "Sign in"}</button></form><p className="auth-note">Access is controlled by your Supabase account and assigned farm role.</p></section></main>;
}

function AuthGate() { const { configured, loading, sessionUserId, profile, profileError, signOut } = useAuth(); if (!configured) return <Home />; if (loading) return <main className="auth-screen"><section className="auth-card"><div className="auth-mark"><Droplets size={22} /></div><span className="eyebrow">GREENFIELDS · FARM OPERATIONS</span><h1>Checking your session.</h1><p className="intro-copy">Connecting securely to your workspace…</p></section></main>; if (!sessionUserId) return <LoginScreen />; if (!profile) return <main className="auth-screen"><section className="auth-card"><div className="auth-mark"><Droplets size={22} /></div><span className="eyebrow">{profileError ? "PROFILE LOAD FAILED" : "PROFILE SETUP REQUIRED"}</span><h1>{profileError ? "We could not load your access." : "Almost there."}</h1><p className="intro-copy">{profileError ?? "Your account is authenticated, but it has not been assigned a farm profile yet. Ask an administrator to provision access."}</p><button className="primary-button auth-submit" onClick={() => signOut()}>Sign out</button></section></main>; return <Home />; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><Toaster position="top-right" /><AuthProvider><AuthGate /></AuthProvider></ThemeProvider></ErrorBoundary>; }
