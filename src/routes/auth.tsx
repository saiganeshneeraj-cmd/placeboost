import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, KeyRound, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PlaceBoost" },
      { name: "description", content: "Sign in to sync your resume analyses and version history across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/sandbox" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/sandbox" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/sandbox` },
        });
        if (error) throw error;
        setMsg("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message || "Auth failed");
    } finally { setLoading(false); }
  };

  const google = async () => {
    setErr(null); setGLoading(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) throw r.error;
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed");
      setGLoading(false);
    }
  };

  return (
    <div className="cosmic-bg min-h-screen text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="inline-flex items-center gap-2 text-sm text-white/70">
          <Sparkles className="h-4 w-4 text-[#4FA8FF]" /> PlaceBoost
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-6 pb-16 pt-6">
        <div className="glass-card p-6">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Sync resumes, ATS scores, and version history across every device.
          </p>

          <button
            onClick={google}
            disabled={gLoading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium hover:bg-white/[0.08] disabled:opacity-60"
          >
            {gLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.9-3.7 8.9-9 0-.6-.1-1.1-.2-1.6H12z"/></svg>
            )}
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-white/40">
            <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/50">
                <Mail className="h-3 w-3" /> Email
              </span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#4FA8FF]/60"
                placeholder="you@college.edu"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/50">
                <KeyRound className="h-3 w-3" /> Password
              </span>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#4FA8FF]/60"
                placeholder="At least 6 characters"
              />
            </label>

            {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</div>}
            {msg && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{msg}</div>}

            <button
              type="submit" disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4D9CFF] to-[#7A5CFF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(122,92,255,0.35)] hover:brightness-110 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); setMsg(null); }}
            className="mt-4 w-full text-center text-xs text-white/60 hover:text-white"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
