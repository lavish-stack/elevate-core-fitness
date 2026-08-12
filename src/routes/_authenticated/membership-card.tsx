import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MemberHeader } from "@/components/member/MemberHeader";
import { SkeletonBlock, EmptyState } from "@/components/gym/States";
import { useSiteSettings } from "@/lib/site-data";

export const Route = createFileRoute("/_authenticated/membership-card")({
  head: () => ({
    meta: [
      { title: "Membership Card — New Fitness Zone" },
      { name: "description", content: "Your digital New Fitness Zone membership card with a scannable QR code." },
      { property: "og:title", content: "Membership Card — New Fitness Zone" },
      { property: "og:description", content: "View your New Fitness Zone digital membership card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MembershipCardPage,
});

const initials = (name: string | null | undefined) => {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

function MembershipCardPage() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const membership = useQuery({
    queryKey: ["membership_card", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data: activeRow, error: activeError } = await supabase
        .from("memberships")
        .select("plan_name,status,starts_at,expires_at,card_code")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeError) throw new Error(activeError.message);
      if (activeRow) return activeRow;

      const { data: latestRow, error: latestError } = await supabase
        .from("memberships")
        .select("plan_name,status,starts_at,expires_at,card_code")
        .eq("user_id", user!.id)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw new Error(latestError.message);
      return latestRow;
    },
  });

  const isLoading = profile.isLoading || membership.isLoading;
  const m = membership.data;
  const isActive = m ? m.status === "active" && m.expires_at >= new Date().toISOString().slice(0, 10) : false;

  const verifyUrl =
    m && typeof window !== "undefined" ? `${window.location.origin}/verify/membership/${m.card_code}` : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberHeader />

      <main className="mx-auto max-w-lg px-5 py-10 sm:py-14">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Digital Card</span>
        <h1 className="font-display mt-3 text-3xl sm:text-4xl leading-[0.95]">Membership Card</h1>
        <p className="mt-3 text-sm text-white/60">
          Show this at the front desk, or let staff scan the QR code to verify your membership instantly.
        </p>

        <div className="mt-8">
          {isLoading && <SkeletonBlock className="h-80" />}

          {!isLoading && !m && (
            <EmptyState
              title="No membership yet"
              description="Once your membership is activated, your digital card will appear here."
            />
          )}

          {!isLoading && m && (
            <div className="card-premium relative overflow-hidden p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between gap-3">
                <span className="font-display text-lg tracking-widest">
                  {settings.name_part1} <span className="text-primary">{settings.name_part2}</span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${
                    isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"
                  }`}
                >
                  {isActive ? "Active" : m.status === "cancelled" ? "Cancelled" : "Expired"}
                </span>
              </div>

              <div className="relative mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-red-700 text-xl font-semibold text-white">
                    {initials(profile.data?.full_name)}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{profile.data?.full_name || "Member"}</div>
                    <div className="text-sm text-white/50">{m.plan_name}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3">
                  {verifyUrl ? (
                    <QRCodeSVG value={verifyUrl} size={112} level="M" />
                  ) : (
                    <div className="h-[112px] w-[112px]" />
                  )}
                </div>
              </div>

              <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Start Date</div>
                  <div className="mt-1 text-white/85">
                    {new Date(`${m.starts_at}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Expiry Date</div>
                  <div className="mt-1 text-white/85">
                    {new Date(`${m.expires_at}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && m && !isActive && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-white/85">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {m.status === "cancelled"
                  ? "This membership has been cancelled."
                  : "This membership has expired."}{" "}
                Visit the front desk or your dashboard to renew.
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
