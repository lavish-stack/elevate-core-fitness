import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Images, CreditCard, Activity, Quote, HelpCircle, Mail, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview — New Fitness Zone" },
      { name: "description", content: "Manage content, members, enquiries and website settings for New Fitness Zone." },
      { property: "og:title", content: "Admin Overview — New Fitness Zone" },
      { property: "og:description", content: "Admin control panel for New Fitness Zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverview,
});

const countOf = async (table: string, filters?: (q: any) => any) => {
  let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
  if (filters) q = filters(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
};

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => ({
      trainers: await countOf("trainers"),
      gallery: await countOf("gallery_images"),
      plans: await countOf("membership_plans"),
      programs: await countOf("programs"),
      testimonials: await countOf("testimonials"),
      faqs: await countOf("faqs"),
      messages: await countOf("contact_messages"),
      unread: await countOf("contact_messages", (q) => q.eq("is_read", false)),
      trials: await countOf("trial_registrations"),
      newTrials: await countOf("trial_registrations", (q) => q.eq("status", "new")),
      members: await countOf("profiles"),
      activeMemberships: await countOf("memberships", (q) => q.eq("status", "active")),
    }),
  });

  const recentTrials = useQuery({
    queryKey: ["admin", "recent_trials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_registrations")
        .select("id,full_name,phone,goal,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const recentMessages = useQuery({
    queryKey: ["admin", "recent_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id,full_name,subject,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const s = stats.data;

  const cards = [
    { label: "Registered members", value: s?.members, hint: `${s?.activeMemberships ?? 0} active memberships`, to: "/admin/trials", icon: Users },
    { label: "Trial registrations", value: s?.trials, hint: `${s?.newTrials ?? 0} new`, to: "/admin/trials", icon: ClipboardList },
    { label: "Contact messages", value: s?.messages, hint: `${s?.unread ?? 0} unread`, to: "/admin/messages", icon: Mail },
    { label: "Trainers", value: s?.trainers, hint: "Manage coaches", to: "/admin/trainers", icon: Users },
    { label: "Gallery images", value: s?.gallery, hint: "Manage photos", to: "/admin/gallery", icon: Images },
    { label: "Membership plans", value: s?.plans, hint: "Manage pricing", to: "/admin/plans", icon: CreditCard },
    { label: "Programs", value: s?.programs, hint: "Manage training", to: "/admin/programs", icon: Activity },
    { label: "Testimonials", value: s?.testimonials, hint: "Manage reviews", to: "/admin/testimonials", icon: Quote },
    { label: "FAQs", value: s?.faqs, hint: "Manage answers", to: "/admin/faqs", icon: HelpCircle },
  ] as const;

  return (
    <AdminShell
      title="DASHBOARD OVERVIEW"
      subtitle="Everything you change here goes live on the website immediately."
    >
      {stats.isLoading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="card-premium p-6 transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <div className="text-xs uppercase tracking-[0.25em] text-white/50">{c.label}</div>
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="font-display mt-4 text-4xl">{c.value ?? 0}</div>
              <div className="mt-1 text-xs text-white/40">{c.hint}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Latest trial signups</div>
          <ul className="mt-4 space-y-3 text-sm">
            {(recentTrials.data ?? []).map((t) => (
              <li key={t.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{t.full_name}</div>
                  <div className="truncate text-xs text-white/50">{t.phone} · {t.goal ?? "—"}</div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-widest text-primary">{t.status}</span>
              </li>
            ))}
            {(recentTrials.data?.length ?? 0) === 0 && (
              <li className="text-white/40">No trial signups yet.</li>
            )}
          </ul>
        </div>

        <div className="card-premium p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Latest messages</div>
          <ul className="mt-4 space-y-3 text-sm">
            {(recentMessages.data ?? []).map((m) => (
              <li key={m.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{m.full_name}</div>
                  <div className="truncate text-xs text-white/50">{m.subject ?? "No subject"}</div>
                </div>
                {!m.is_read && (
                  <span className="shrink-0 text-[10px] uppercase tracking-widest text-primary">New</span>
                )}
              </li>
            ))}
            {(recentMessages.data?.length ?? 0) === 0 && (
              <li className="text-white/40">No messages yet.</li>
            )}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
