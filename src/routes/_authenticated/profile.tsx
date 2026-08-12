import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SkeletonBlock } from "@/components/gym/States";
import { MemberHeader } from "@/components/member/MemberHeader";
import { formatINR } from "@/lib/site-data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — New Fitness Zone" },
      {
        name: "description",
        content:
          "Update your New Fitness Zone profile details and review your full membership history.",
      },
      { property: "og:title", content: "My Profile — New Fitness Zone" },
      { property: "og:description", content: "Manage your member profile and membership history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{6,20}$/, "Please enter a valid phone number")
    .or(z.literal("")),
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "" });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,avatar_url,created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setForm({ full_name: profile.data.full_name ?? "", phone: profile.data.phone ?? "" });
    }
  }, [profile.data]);

  const history = useQuery({
    queryKey: ["memberships", "history", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id,plan_name,amount_inr,status,starts_at,expires_at,card_code,created_at")
        .order("starts_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid details");
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user!.id,
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
        })
        .eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const input =
    "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <h1 className="font-display mt-4 text-5xl md:text-6xl leading-[0.95]">
          MY <span className="text-gradient-red">PROFILE</span>.
        </h1>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="card-premium p-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Edit details</div>
            {profile.isLoading ? (
              <div className="mt-6 space-y-4">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="full_name" className="block text-xs uppercase tracking-widest text-white/50">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    className={input}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-white/50">
                    Phone
                  </label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className={input}
                    placeholder="+91 …"
                  />
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-widest text-white/50">Email</span>
                  <p className="mt-2 break-all text-sm text-white/60">{user?.email}</p>
                </div>
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="btn-primary !py-3 !px-6 text-sm disabled:opacity-60"
                >
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </button>
              </div>
            )}
          </section>

          <section className="card-premium p-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Membership history</div>
            {history.isLoading ? (
              <div className="mt-6 space-y-3">
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
              </div>
            ) : (history.data?.length ?? 0) === 0 ? (
              <p className="mt-5 text-sm text-white/50">
                No memberships yet. Once your plan is activated it will appear here.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {history.data!.map((m) => (
                  <li key={m.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{m.plan_name}</span>
                      <span className="text-[10px] uppercase tracking-widest text-primary">
                        {m.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {new Date(m.starts_at).toLocaleDateString("en-IN")} —{" "}
                      {new Date(m.expires_at).toLocaleDateString("en-IN")} · ₹
                      {formatINR(Number(m.amount_inr))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
