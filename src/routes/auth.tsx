import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Dumbbell, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSiteSettings } from "@/lib/site-data";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Member Login — New Fitness Zone" },
      { name: "description", content: "Sign in or create your New Fitness Zone account to manage your membership, book trainers and view your digital membership card." },
      { property: "og:title", content: "Member Login — New Fitness Zone" },
      { property: "og:description", content: "Access your New Fitness Zone member dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const safePath = (value: string | undefined) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const target = safePath(search.redirect);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: target, replace: true });
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { full_name: fullName.trim().slice(0, 100) },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Welcome to the club!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth${search.redirect ? `?redirect=${encodeURIComponent(target)}` : ""}`,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700 shadow-lg">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-2xl tracking-widest">
            {settings.name_part1} <span className="text-primary">{settings.name_part2}</span>
          </span>
        </Link>

        <div className="card-premium mt-8 p-8">
          <h1 className="font-display text-3xl">
            {mode === "signin" ? "MEMBER LOGIN" : "CREATE ACCOUNT"}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {mode === "signin"
              ? "Access your membership, bookings and digital card."
              : `Join the club and start your ${settings.trial_days}-day free trial.`}
          </p>

          {sent ? (
            <div className="mt-6 glass rounded-2xl p-5 text-sm text-white/75">
              We've sent a confirmation link to <span className="text-primary">{email}</span>. Click it
              to activate your account, then sign in.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    required
                    placeholder="Rahul Sharma"
                    className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition"
                  />
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  placeholder="you@gmail.com"
                  className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="At least 8 characters"
                  className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign In" : "Create Account"}
                {!busy && <ChevronRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-white/40">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>

          <button onClick={google} disabled={busy} className="btn-ghost w-full disabled:opacity-60">
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-white/60">
            {mode === "signin" ? "New here?" : "Already a member?"}{" "}
            <button
              onClick={() => {
                setSent(false);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-white/50 hover:text-primary transition">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
