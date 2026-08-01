import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { ImageUploadField } from "@/components/admin/CrudManager";
import { uploadSiteImage } from "@/lib/admin-upload";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Website Settings — New Fitness Zone Admin" },
      { name: "description", content: "Update the gym name, logo, hero images, contact details, social links and opening hours." },
      { property: "og:title", content: "Website Settings — New Fitness Zone Admin" },
      { property: "og:description", content: "Control global website settings and contact details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsAdmin,
});

const schema = z.object({
  gym_name: z.string().trim().min(1, "Gym name is required").max(120),
  name_part1: z.string().trim().min(1, "First part of the name is required").max(60),
  name_part2: z.string().trim().min(1, "Second part of the name is required").max(60),
  tagline: z.string().trim().max(200),
  logo_url: z.string().trim().max(2000),
  trial_days: z.coerce.number().int().min(0).max(60),
  phone: z.string().trim().max(40),
  email: z.string().trim().max(255).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email"),
  address: z.string().trim().max(400),
  whatsapp: z.string().trim().max(20).refine((v) => v === "" || /^\d{8,15}$/.test(v), "Digits only, with country code"),
  instagram_url: z.string().trim().max(500),
  facebook_url: z.string().trim().max(500),
  map_embed_url: z.string().trim().max(1000),
  opening_hours: z.string().trim().max(300),
});

type FormState = z.input<typeof schema> & { hero_images: string[] };

const EMPTY: FormState = {
  gym_name: "",
  name_part1: "",
  name_part2: "",
  tagline: "",
  logo_url: "",
  trial_days: 2,
  phone: "",
  email: "",
  address: "",
  whatsapp: "",
  instagram_url: "",
  facebook_url: "",
  map_embed_url: "",
  opening_hours: "",
  hero_images: [],
};

function SettingsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [heroBusy, setHeroBusy] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      gym_name: data.gym_name ?? "",
      name_part1: data.name_part1 ?? "",
      name_part2: data.name_part2 ?? "",
      tagline: data.tagline ?? "",
      logo_url: data.logo_url ?? "",
      trial_days: data.trial_days ?? 2,
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
      whatsapp: data.whatsapp ?? "",
      instagram_url: data.instagram_url ?? "",
      facebook_url: data.facebook_url ?? "",
      map_embed_url: data.map_embed_url ?? "",
      opening_hours: data.opening_hours ?? "",
      hero_images: Array.isArray(data.hero_images) ? (data.hero_images as string[]) : [],
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Please check the form");
      }
      const payload = {
        ...parsed.data,
        logo_url: parsed.data.logo_url || null,
        instagram_url: parsed.data.instagram_url || null,
        facebook_url: parsed.data.facebook_url || null,
        map_embed_url: parsed.data.map_embed_url || null,
        hero_images: form.hero_images,
      };
      if (data?.id) {
        const { error } = await supabase.from("site_settings").update(payload).eq("id", data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("site_settings").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Settings saved — the website is updated.");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save settings"),
  });

  const addHero = async (file: File | undefined) => {
    if (!file) return;
    setHeroBusy(true);
    try {
      const url = await uploadSiteImage(file, "hero");
      setForm((p) => ({ ...p, hero_images: [...p.hero_images, url] }));
      toast.success("Hero image added — remember to save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setHeroBusy(false);
    }
  };

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const input =
    "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60";
  const labelCls = "block text-xs uppercase tracking-widest text-white/50";

  if (isLoading) {
    return (
      <AdminShell title="WEBSITE SETTINGS">
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="WEBSITE SETTINGS"
      subtitle="Brand, contact details, social links and hero images. Saved changes go live instantly."
    >
      {isError && (
        <div className="mb-6 card-premium p-6 text-sm text-primary">Could not load settings. Please refresh.</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-7 space-y-5">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Brand</div>
          <div>
            <label className={labelCls}>Gym name</label>
            <input value={form.gym_name} onChange={set("gym_name")} className={input} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name part 1</label>
              <input value={form.name_part1} onChange={set("name_part1")} className={input} />
            </div>
            <div>
              <label className={labelCls}>Name part 2 (red)</label>
              <input value={form.name_part2} onChange={set("name_part2")} className={input} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input value={form.tagline} onChange={set("tagline")} className={input} />
          </div>
          <div>
            <label className={labelCls}>Free trial days</label>
            <input
              type="number"
              value={String(form.trial_days)}
              onChange={(e) => setForm((p) => ({ ...p, trial_days: e.target.value }))}
              className={input}
            />
          </div>
          <ImageUploadField
            label="Logo"
            folder="branding"
            value={form.logo_url}
            onChange={(url) => setForm((p) => ({ ...p, logo_url: url }))}
          />
        </div>

        <div className="card-premium p-7 space-y-5">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Contact</div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.phone} onChange={set("phone")} className={input} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.email} onChange={set("email")} className={input} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp (digits with country code)</label>
            <input value={form.whatsapp} onChange={set("whatsapp")} className={input} placeholder="910000000000" />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <textarea rows={3} value={form.address} onChange={set("address")} className={input} />
          </div>
          <div>
            <label className={labelCls}>Opening hours</label>
            <input value={form.opening_hours} onChange={set("opening_hours")} className={input} />
          </div>
          <div>
            <label className={labelCls}>Google Maps embed URL</label>
            <input value={form.map_embed_url} onChange={set("map_embed_url")} className={input} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Instagram URL</label>
              <input value={form.instagram_url} onChange={set("instagram_url")} className={input} />
            </div>
            <div>
              <label className={labelCls}>Facebook URL</label>
              <input value={form.facebook_url} onChange={set("facebook_url")} className={input} />
            </div>
          </div>
        </div>

        <div className="card-premium p-7 lg:col-span-2">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Hero images</div>
          <p className="mt-2 text-xs text-white/40">
            Used as the hero background. Leave empty to keep the built-in image.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            {form.hero_images.map((url, i) => (
              <div key={`${url}-${i}`} className="relative h-24 w-36 overflow-hidden rounded-xl border border-white/10">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() =>
                    setForm((p) => ({ ...p, hero_images: p.hero_images.filter((_, idx) => idx !== i) }))
                  }
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 p-1.5 text-white/80 hover:text-primary"
                  aria-label="Remove hero image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <label className="grid h-24 w-36 cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:border-primary/50 hover:text-primary">
              {heroBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "+ Add image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={heroBusy}
                onChange={(e) => void addHero(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-primary !py-3 !px-7 text-sm disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
        </button>
      </div>
    </AdminShell>
  );
}
