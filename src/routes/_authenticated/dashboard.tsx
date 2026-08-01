import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, formatINR } from "@/lib/site-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Member Dashboard — New Fitness Zone" },
      { name: "description", content: "View your membership status, expiry date, payments and trainer bookings at New Fitness Zone." },
      { property: "og:title", content: "Member Dashboard — New Fitness Zone" },
      { property: "og:description", content: "Your New Fitness Zone membership at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: membership, isLoading } = useQuery({
    queryKey: ["membership", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const daysLeft = membership
    ? Math.ceil((new Date(membership.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl tracking-widest">
              {settings.name_part1} <span className="text-primary">{settings.name_part2}</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary transition-colors hover:bg-primary/25"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
              </Link>
            )}
            <button onClick={signOut} className="btn-ghost !py-2 !px-4 text-sm">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Member Area</span>
        <h1 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
          WELCOME BACK,{" "}
          <span className="text-gradient-red">
            {(profile?.full_name ?? user?.email ?? "MEMBER").split(" ")[0]?.toUpperCase()}
          </span>
          .
        </h1>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <div className="card-premium p-7 md:col-span-2">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Your Membership</div>
            {isLoading ? (
              <div className="mt-6 flex items-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : membership ? (
              <>
                <h2 className="mt-2 font-display text-3xl">{membership.plan_name}</h2>
                <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="glass rounded-2xl p-4">
                    <div className="text-white/50 text-xs uppercase tracking-widest">Status</div>
                    <div className="mt-1 font-semibold text-primary capitalize">{membership.status}</div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="text-white/50 text-xs uppercase tracking-widest">Expires</div>
                    <div className="mt-1 font-semibold">
                      {new Date(membership.expires_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="text-white/50 text-xs uppercase tracking-widest">Days left</div>
                    <div className="mt-1 font-semibold">{daysLeft !== null && daysLeft > 0 ? daysLeft : 0}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-white/60">
                  Paid ₹{formatINR(Number(membership.amount_inr))}
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-3xl">NO ACTIVE PLAN</h2>
                <p className="mt-2 text-white/60 text-sm max-w-md">
                  You don't have a membership yet. Start with the {settings.trial_days}-day free trial or
                  pick a plan from the website.
                </p>
                <a href="/#membership" className="btn-primary mt-6 inline-flex">
                  View Plans
                </a>
              </>
            )}
          </div>

          <div className="card-premium p-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Account</div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="text-white/50 text-xs uppercase tracking-widest">Name</div>
                <div className="mt-0.5">{profile?.full_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs uppercase tracking-widest">Email</div>
                <div className="mt-0.5 break-all">{user?.email}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs uppercase tracking-widest">Phone</div>
                <div className="mt-0.5">{profile?.phone ?? "—"}</div>
              </div>
            </div>
            <p className="mt-6 text-xs text-white/40">
              Trainer bookings, QR membership card and payments are coming in the next phase.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
