/**
 * Live site content — reads from the database with the static content in
 * `@/content/site` as fallback so the site always renders, even offline.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BRAND,
  CONTACT,
  TRAINERS,
  GALLERY,
  PLANS,
  TESTIMONIALS,
} from "@/content/site";

export type SiteSettings = {
  id: string;
  gym_name: string;
  name_part1: string;
  name_part2: string;
  tagline: string;
  logo_url: string | null;
  hero_images: string[];
  trial_days: number;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  instagram_url: string | null;
  facebook_url: string | null;
  map_embed_url: string | null;
  opening_hours: string;
};

export const FALLBACK_SETTINGS: SiteSettings = {
  id: "",
  gym_name: BRAND.fullName,
  name_part1: BRAND.namePart1,
  name_part2: BRAND.namePart2,
  tagline: BRAND.tagline,
  logo_url: null,
  hero_images: [],
  trial_days: BRAND.trialDays,
  phone: CONTACT.phone,
  email: CONTACT.email,
  address: CONTACT.address,
  whatsapp: CONTACT.whatsapp,
  instagram_url: null,
  facebook_url: null,
  map_embed_url: CONTACT.mapEmbedUrl,
  opening_hours: CONTACT.hours,
};

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ["site_settings"],
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        hero_images: Array.isArray(data.hero_images) ? (data.hero_images as string[]) : [],
      } as SiteSettings;
    },
    staleTime: 30_000,
  });
  return { settings: query.data ?? FALLBACK_SETTINGS, ...query };
}

type TrainerRow = {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  tags: unknown;
  experience: string | null;
  is_head: boolean;
  sort_order: number;
};

export type TrainerView = {
  id: string;
  name: string;
  role: string;
  img: string;
  tags: string[];
  exp: string;
  isHead: boolean;
};

export function useTrainers() {
  const query = useQuery({
    queryKey: ["trainers", "public"],
    queryFn: async (): Promise<TrainerView[]> => {
      const { data, error } = await supabase
        .from("trainers")
        .select("id,name,role,photo_url,tags,experience,is_head,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as TrainerRow[]).map((t, i) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        img: t.photo_url || TRAINERS[i % TRAINERS.length]!.img,
        tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
        exp: t.experience ?? (t.is_head ? "Head Coach" : "Coach"),
        isHead: t.is_head,
      }));
    },
    staleTime: 30_000,
  });
  const fallback: TrainerView[] = TRAINERS.map((t, i) => ({
    id: `static-${i}`,
    name: t.name,
    role: t.role,
    img: t.img,
    tags: t.tags,
    exp: t.exp,
    isHead: "isHead" in t ? Boolean(t.isHead) : false,
  }));
  return { trainers: query.data?.length ? query.data : fallback, ...query };
}

export type GalleryView = { id: string; src: string; alt: string; cls?: string };

export function useGallery() {
  const query = useQuery({
    queryKey: ["gallery", "public"],
    queryFn: async (): Promise<GalleryView[]> => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id,image_url,alt_text,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((g, i) => ({
        id: g.id,
        src: g.image_url,
        alt: g.alt_text,
        cls: GALLERY[i % GALLERY.length]?.cls,
      }));
    },
    staleTime: 30_000,
  });
  const fallback: GalleryView[] = GALLERY.map((g, i) => ({
    id: `static-${i}`,
    src: g.src,
    alt: g.alt,
    cls: g.cls,
  }));
  return { gallery: query.data?.length ? query.data : fallback, ...query };
}

export type TestimonialView = { id: string; name: string; role: string; text: string; rating: number };

export function useTestimonials() {
  const query = useQuery({
    queryKey: ["testimonials", "public"],
    queryFn: async (): Promise<TestimonialView[]> => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("id,name,role,text,rating,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((t) => ({ id: t.id, name: t.name, role: t.role, text: t.text, rating: t.rating }));
    },
    staleTime: 30_000,
  });
  const fallback: TestimonialView[] = TESTIMONIALS.map((t, i) => ({
    id: `static-${i}`,
    name: t.name,
    role: t.role,
    text: t.text,
    rating: 5,
  }));
  return { testimonials: query.data?.length ? query.data : fallback, ...query };
}

export type ProgramView = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  featured: boolean;
};

const STATIC_PROGRAMS: ProgramView[] = [
  { id: "s1", title: "Weight Lifting", description: "Our #1 specialty — barbell technique, progressive overload and serious lifting.", icon: "Dumbbell", featured: true },
  { id: "s2", title: "Strength Training", description: "Our #1 specialty — squat, bench and deadlift programmed for real strength gains.", icon: "Trophy", featured: true },
  { id: "s3", title: "Muscle Building", description: "Hypertrophy programming built for clean, visible size and shape.", icon: "Zap", featured: false },
  { id: "s4", title: "Powerlifting", description: "Competition-focused coaching on the big three lifts and meet prep.", icon: "Target", featured: false },
  { id: "s5", title: "Fat Loss", description: "Strength-first fat loss that keeps your muscle while the weight drops.", icon: "Flame", featured: false },
  { id: "s6", title: "Functional Fitness", description: "Real-world movement patterns for pain-free everyday power.", icon: "Activity", featured: false },
  { id: "s7", title: "Cardio & Conditioning", description: "Endurance work that supports your lifting, not against it.", icon: "Heart", featured: false },
  { id: "s8", title: "Personal Training", description: "1-on-1 coaching, custom plans and full accountability.", icon: "Users", featured: false },
];

export function usePrograms() {
  const query = useQuery({
    queryKey: ["programs", "public"],
    queryFn: async (): Promise<ProgramView[]> => {
      const { data, error } = await supabase
        .from("programs")
        .select("id,title,description,icon,is_featured,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        icon: p.icon,
        featured: p.is_featured,
      }));
    },
    staleTime: 30_000,
  });
  return { programs: query.data?.length ? query.data : STATIC_PROGRAMS, ...query };
}

export type PlanView = {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  tag: string;
  feats: string[];
  recommended: boolean;
  durationDays: number;
};

export const formatINR = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

export function usePlans() {
  const query = useQuery({
    queryKey: ["membership_plans", "public"],
    queryFn: async (): Promise<PlanView[]> => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("id,name,price_inr,period_label,duration_days,tag,features,is_recommended,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: formatINR(Number(p.price_inr)),
        priceValue: Number(p.price_inr),
        period: p.period_label,
        tag: p.tag ?? "",
        feats: Array.isArray(p.features) ? (p.features as string[]) : [],
        recommended: p.is_recommended,
        durationDays: p.duration_days,
      }));
    },
    staleTime: 30_000,
  });
  const fallback: PlanView[] = PLANS.map((p, i) => ({
    id: `static-${i}`,
    name: p.name,
    price: p.price,
    priceValue: Number(p.price.replace(/,/g, "")),
    period: p.period,
    tag: p.tag,
    feats: p.feats,
    recommended: "recommended" in p ? Boolean(p.recommended) : false,
    durationDays: 30,
  }));
  return { plans: query.data?.length ? query.data : fallback, ...query };
}

export type FaqView = { id: string; q: string; a: string };

export function useFaqs(trialDays: number, hours: string) {
  const query = useQuery({
    queryKey: ["faqs", "public"],
    queryFn: async (): Promise<FaqView[]> => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id,question,answer,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((f) => ({ id: f.id, q: f.question, a: f.answer }));
    },
    staleTime: 30_000,
  });
  const fallback: FaqView[] = [
    { id: "f1", q: "Do you offer a free trial?", a: `Yes — every new member gets a free ${trialDays}-day trial with full access to the weight-lifting floor, strength zone and a walkthrough with a trainer.` },
    { id: "f2", q: "Are there long-term contracts?", a: "No lock-in. All plans are monthly, quarterly or annual and paid upfront. No hidden charges." },
    { id: "f3", q: "What are your timings?", a: hours + ". Timings may vary on public holidays." },
    { id: "f4", q: "Is personal training included?", a: "Quarterly and Annual plans include sessions. Any member can add personal training separately." },
    { id: "f5", q: "Is the gym beginner-friendly for women?", a: "Absolutely. Our trainers guide beginners through proper form step by step, and many of our members are women training with weights." },
  ];
  return { faqs: query.data?.length ? query.data : fallback, ...query };
}
