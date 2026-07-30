import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dumbbell,
  Flame,
  Heart,
  Zap,
  Users,
  Trophy,
  Target,
  Activity,
  ChevronRight,
  Check,
  Star,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowUp,
  Menu,
  X,
  MessageCircle,
  Play,
  ArrowDown,
  Plus,
  Minus,
} from "lucide-react";
import { Reveal } from "@/components/gym/Reveal";
import { Counter } from "@/components/gym/Counter";
import heroImg from "@/assets/hero-gym.jpg";
import interiorImg from "@/assets/gym-interior.jpg";
import { BRAND, CONTACT, TRAINERS, GALLERY, PLANS, TESTIMONIALS } from "@/content/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IRONFORGE — Premium 24/7 Fitness Club" },
      {
        name: "description",
        content:
          "IRONFORGE is a luxury 24/7 fitness club with elite coaches, world-class equipment and results-driven programs. Claim your free 7-day trial.",
      },
      { property: "og:title", content: "IRONFORGE — Premium 24/7 Fitness Club" },
      {
        property: "og:description",
        content: "Elite training. Premium equipment. Real results.",
      },
    ],
  }),
  component: Home,
});

const NAV = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Programs", href: "#programs" },
  { label: "Membership", href: "#membership" },
  { label: "Trainers", href: "#trainers" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowTop(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <Marquee />
      <About />
      <Programs />
      <Membership />
      <Trainers />
      <Gallery />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />

      {/* Floating actions */}
      <a
        href="https://wa.me/15551234567"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl animate-pulse-red hover:scale-110 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-24 right-6 z-40 grid h-12 w-12 place-items-center rounded-full glass-strong text-white hover:text-primary transition-colors animate-float-up"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function Nav({
  scrolled,
  menuOpen,
  setMenuOpen,
}: {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-strong py-3" : "py-5 bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 flex items-center justify-between gap-4">
        <a href="#home" className="flex items-center gap-2 shrink-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700 shadow-lg">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-2xl tracking-widest">
            IRON<span className="text-primary">FORGE</span>
          </span>
        </a>
        <nav className="hidden lg:flex items-center gap-7 text-sm">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="relative text-white/75 hover:text-white transition-colors after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="#membership" className="hidden md:inline-flex btn-primary text-sm !py-2.5 !px-5">
            Join Now <ChevronRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden grid h-10 w-10 place-items-center rounded-lg glass text-white"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden mt-3 mx-4 glass-strong rounded-2xl p-5 animate-float-up">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-3 rounded-lg text-white/85 hover:bg-white/5 hover:text-primary transition"
              >
                {n.label}
              </a>
            ))}
            <a
              href="#membership"
              onClick={() => setMenuOpen(false)}
              className="btn-primary mt-3"
            >
              Join Now
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-24">
      <img
        src={heroImg}
        alt="Athlete training with barbell in dark red-lit gym"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/80 animate-float-up">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-red" />
            Open 24/7 · Now Enrolling
          </div>
          <h1
            className="font-display mt-6 text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.85] tracking-tight animate-float-up"
            style={{ animationDelay: "80ms" }}
          >
            FORGE THE
            <br />
            <span className="text-gradient-red">STRONGEST</span>
            <br />
            VERSION OF YOU
          </h1>
          <p
            className="mt-7 max-w-xl text-lg text-white/70 animate-float-up"
            style={{ animationDelay: "180ms" }}
          >
            Elite coaching. World-class equipment. A club built for people who refuse average.
            Train where champions are made — and start seeing real results in 30 days.
          </p>
          <div
            className="mt-8 flex flex-wrap gap-4 animate-float-up"
            style={{ animationDelay: "260ms" }}
          >
            <a href="#membership" className="btn-primary">
              Join Now <ChevronRight className="h-4 w-4" />
            </a>
            <a href="#contact" className="btn-ghost">
              <Play className="h-4 w-4" /> Free 7-Day Trial
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: 12500, s: "+", label: "Active Members" },
            { n: 48, s: "", label: "Elite Trainers" },
            { n: 15, s: "yrs", label: "Years of Results" },
            { n: 120, s: "+", label: "Weekly Classes" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="glass rounded-2xl p-5 md:p-6 hover:border-primary/60 transition">
                <div className="font-display text-4xl md:text-5xl text-white">
                  <Counter end={s.n} suffix={s.s} />
                </div>
                <div className="mt-1 text-xs md:text-sm text-white/60 uppercase tracking-widest">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-white/60">
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <ArrowDown className="h-4 w-4 animate-scroll-hint" />
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Strength", "Conditioning", "Hypertrophy", "CrossFit", "Boxing", "Recovery", "Nutrition", "Mobility"];
  return (
    <div className="relative border-y border-white/5 bg-black/40 py-6 overflow-hidden">
      <div className="marquee-track flex gap-16 whitespace-nowrap font-display text-4xl md:text-5xl text-white/10">
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-16">
            {it}
            <span className="text-primary">★</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function About() {
  const features = [
    { icon: Trophy, title: "Award-Winning Facility", desc: "Voted #1 luxury fitness club three years running." },
    { icon: Zap, title: "24/7 Access", desc: "Train when you want, at your pace, on your schedule." },
    { icon: Target, title: "Results-Driven", desc: "Every program is engineered around measurable progress." },
    { icon: Users, title: "Community That Lifts", desc: "Join thousands of members who show up for each other." },
  ];
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl" />
            <img
              src={interiorImg}
              alt="Premium gym interior with red LED lighting"
              width={1600}
              height={1000}
              loading="lazy"
              className="relative rounded-3xl border border-white/10 shadow-2xl"
            />
            <div className="absolute -bottom-6 -right-6 glass-strong rounded-2xl p-5 hidden md:block">
              <div className="font-display text-4xl text-primary">15+</div>
              <div className="text-xs uppercase tracking-widest text-white/70">Years Building Champions</div>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">About IronForge</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
              MORE THAN A GYM.<br />
              <span className="text-gradient-red">A STANDARD.</span>
            </h2>
            <p className="mt-6 text-white/70 text-lg leading-relaxed">
              Since 2010, IronForge has been the training ground for athletes, executives and everyday
              warriors chasing greatness. We built a space where world-class equipment, elite coaching
              and an uncompromising community come together — so you have zero excuses left.
            </p>
          </Reveal>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="card-premium p-5 h-full">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-semibold text-white">{f.title}</div>
                  <div className="mt-1 text-sm text-white/60">{f.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Programs() {
  const items = [
    { icon: Dumbbell, title: "Weight Training", desc: "Structured lifting programs for size, strength and shape." },
    { icon: Flame, title: "Fat Loss", desc: "Metabolic conditioning built to torch fat and reveal definition." },
    { icon: Trophy, title: "Strength", desc: "Powerlifting fundamentals: squat, bench, deadlift, mastered." },
    { icon: Heart, title: "Cardio", desc: "Endurance sessions engineered for a heart that never quits." },
    { icon: Activity, title: "Functional", desc: "Real-world movement patterns for pain-free everyday power." },
    { icon: Zap, title: "CrossFit", desc: "High-intensity, community-driven WODs that break plateaus." },
    { icon: Target, title: "Personal Training", desc: "1-on-1 coaching, custom plans and full accountability." },
    { icon: Users, title: "Group Classes", desc: "Boxing, HIIT, spin, yoga and mobility — all week long." },
  ];
  return (
    <section id="programs" className="relative py-24 md:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Programs</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
              TRAIN WITH <span className="text-gradient-red">PURPOSE</span>.
            </h2>
            <p className="mt-5 text-white/70 text-lg">
              Whatever your goal, we've built a program to get you there — coached by pros,
              powered by data, and backed by a community that shows up.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((p, i) => (
            <Reveal key={p.title} delay={(i % 4) * 80}>
              <div className="card-premium group p-6 h-full">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-red-700 text-white shadow-lg group-hover:scale-110 transition-transform">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-2xl tracking-wide">{p.title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{p.desc}</p>
                <div className="mt-5 inline-flex items-center text-xs uppercase tracking-[0.2em] text-primary/80 group-hover:text-primary transition">
                  Explore <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Membership() {
  const plans = [
    {
      name: "Monthly",
      price: 49,
      period: "/mo",
      tag: "Flexible",
      feats: ["24/7 gym access", "All group classes", "Locker & towel service", "Free WiFi & coffee bar"],
    },
    {
      name: "Quarterly",
      price: 129,
      period: "/3 mo",
      tag: "Popular",
      feats: ["Everything in Monthly", "1 personal training session", "Body composition scan", "Nutrition guide"],
    },
    {
      name: "Elite Annual",
      price: 449,
      period: "/yr",
      tag: "Best Value",
      recommended: true,
      feats: [
        "Everything in Quarterly",
        "6 personal training sessions",
        "Custom training program",
        "Recovery lounge access",
        "Guest passes (12/yr)",
      ],
    },
    {
      name: "Signature",
      price: 199,
      period: "/mo",
      tag: "Premium",
      feats: [
        "Unlimited personal training",
        "Dedicated head coach",
        "Weekly nutrition coaching",
        "Priority booking",
        "InBody scan & monthly review",
      ],
    },
  ];
  return (
    <section id="membership" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Membership</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
              CHOOSE YOUR <span className="text-gradient-red">EDGE</span>.
            </h2>
            <p className="mt-5 text-white/70 text-lg">
              Every plan includes 24/7 access and every group class. No contracts, no hidden fees.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <div
                className={`relative card-premium p-7 h-full flex flex-col ${
                  p.recommended
                    ? "!border-primary/70 glow-red bg-gradient-to-b from-red-950/40 to-transparent scale-[1.02]"
                    : ""
                }`}
              >
                {p.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] uppercase tracking-widest font-semibold shadow-lg">
                    Recommended
                  </div>
                )}
                <div className="text-xs uppercase tracking-[0.25em] text-white/50">{p.tag}</div>
                <h3 className="mt-2 font-display text-3xl">{p.name}</h3>
                <div className="mt-4 flex items-end gap-1">
                  <span className="font-display text-5xl text-white">${p.price}</span>
                  <span className="text-white/50 mb-1.5">{p.period}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-white/75 flex-1">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`mt-7 text-center ${p.recommended ? "btn-primary" : "btn-ghost"}`}
                >
                  Get Started
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/50">
          All memberships come with a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

function Trainers() {
  const list = TRAINERS;

  return (
    <section id="trainers" className="relative py-24 md:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs uppercase tracking-[0.3em] text-primary">Coaches</span>
              <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
                MEET THE <span className="text-gradient-red">EXPERTS</span>.
              </h2>
            </div>
            <p className="text-white/60 max-w-md">
              Led by Head Trainer Harshvardhan Koli — specialists in weight lifting, strength
              training and powerlifting, focused entirely on your progress.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div
                className={`group relative overflow-hidden rounded-3xl border aspect-[4/5] ${
                  "isHead" in t && t.isHead ? "border-primary/70 glow-red" : "border-white/10"
                }`}
              >
                <img
                  src={t.img}
                  alt={`${t.name} — ${t.role}`}
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                {"isHead" in t && t.isHead && (
                  <div className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg">
                    Head Trainer
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-primary">{t.exp}</div>
                  <h3 className="font-display text-2xl mt-1">{t.name}</h3>
                  <div className="text-sm text-white/70">{t.role}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.tags.map((tag) => (
                      <span key={tag} className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full glass">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a aria-label="Instagram" href="#" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-primary hover:text-white transition">
                      <Instagram className="h-4 w-4" />
                    </a>
                    <a aria-label="Twitter" href="#" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-primary hover:text-white transition">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <BMI />
      </div>
    </section>
  );
}

function BMI() {
  const [h, setH] = useState(175);
  const [w, setW] = useState(72);
  const bmi = w / ((h / 100) * (h / 100));
  const category =
    bmi < 18.5 ? "Underweight" : bmi < 25 ? "Optimal" : bmi < 30 ? "Overweight" : "High risk";
  return (
    <Reveal>
      <div className="mt-20 grid lg:grid-cols-2 gap-6 items-stretch">
        <div className="card-premium p-8">
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Free Tool</span>
          <h3 className="font-display mt-3 text-3xl md:text-4xl">BMI Calculator</h3>
          <p className="mt-2 text-white/60 text-sm">
            Quick check on where you stand. Our coaches turn numbers into a real plan.
          </p>
          <div className="mt-6 space-y-5">
            <label className="block">
              <div className="flex justify-between text-sm text-white/70">
                <span>Height</span>
                <span className="text-primary">{h} cm</span>
              </div>
              <input
                type="range"
                min={140}
                max={220}
                value={h}
                onChange={(e) => setH(+e.target.value)}
                className="mt-2 w-full accent-primary"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-sm text-white/70">
                <span>Weight</span>
                <span className="text-primary">{w} kg</span>
              </div>
              <input
                type="range"
                min={40}
                max={180}
                value={w}
                onChange={(e) => setW(+e.target.value)}
                className="mt-2 w-full accent-primary"
              />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-between glass rounded-2xl p-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Your BMI</div>
              <div className="font-display text-5xl text-white">{bmi.toFixed(1)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-white/60">Category</div>
              <div className="font-semibold text-primary">{category}</div>
            </div>
          </div>
        </div>
        <div className="card-premium p-8 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Included with Membership</span>
            <h3 className="font-display mt-3 text-3xl md:text-4xl">Programs & Nutrition</h3>
            <ul className="mt-6 space-y-4 text-white/80">
              {[
                "Custom workout programs updated every 4 weeks",
                "Personalized macro & meal guidance",
                "Progress tracking with monthly strength benchmarks",
                "Direct message access to your coach",
              ].map((t) => (
                <li key={t} className="flex gap-3 items-start">
                  <div className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-primary shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <a href="#membership" className="btn-primary mt-8 self-start">
            Claim Free Consultation <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Reveal>
  );
}

function Gallery() {
  const imgs = GALLERY;

  return (
    <section id="gallery" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Transformations</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
              REAL WORK. <span className="text-gradient-red">REAL RESULTS</span>.
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-4">
          {imgs.map((im, i) => (
            <Reveal key={i} delay={i * 60} className={`${im.cls ?? ""} group`}>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={im.src}
                  alt={im.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-3 left-3 text-xs uppercase tracking-widest text-white/90 opacity-0 group-hover:opacity-100 transition">
                  {im.alt}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = TESTIMONIALS;

  return (
    <section id="testimonials" className="relative py-24 md:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Members</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
              STORIES FROM <span className="text-gradient-red">THE FLOOR</span>.
            </h2>
          </div>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="card-premium p-7 h-full">
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-5 text-white/85 leading-relaxed">"{t.text}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-red-800 font-display text-lg">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-white/50">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Do you offer a free trial?", a: `Yes — every new member gets a free ${BRAND.trialDays}-day trial with full access to the weight-lifting floor, strength zone and a walkthrough with a trainer.` },
    { q: "Are there long-term contracts?", a: "No lock-in. All plans are monthly, quarterly or annual and paid upfront. No hidden charges." },
    { q: "What are your timings?", a: CONTACT.hours + ". Timings may vary on public holidays." },
    { q: "Is personal training included?", a: "Quarterly and Annual plans include sessions. Any member can add personal training separately." },
    { q: "Is the gym beginner-friendly for women?", a: "Absolutely. Our trainers guide beginners through proper form step by step, and many of our members are women training with weights." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-5">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-primary">FAQ</span>
            <h2 className="font-display mt-3 text-5xl md:text-6xl">
              GOT <span className="text-gradient-red">QUESTIONS</span>?
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 space-y-3">
          {items.map((it, i) => (
            <Reveal key={it.q} delay={i * 60}>
              <div className="card-premium overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                >
                  <span className="font-semibold text-lg">{it.q}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    {open === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-500 ${
                    open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-white/70">{it.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="relative py-24 md:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-10">
        <Reveal>
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Contact</span>
          <h2 className="font-display mt-3 text-5xl md:text-6xl leading-[0.95]">
            START YOUR<br /><span className="text-gradient-red">TRANSFORMATION</span>.
          </h2>
          <p className="mt-5 text-white/70 text-lg max-w-lg">
            Drop us a line and a coach will get back within 24 hours to schedule your free tour and trial session.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: MapPin, label: CONTACT.address },
              { icon: Phone, label: CONTACT.phone },
              { icon: Mail, label: CONTACT.email },
              { icon: Clock, label: CONTACT.hours },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <span className="text-white/80">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl overflow-hidden border border-white/10 aspect-[16/9]">
            <iframe
              title={`${BRAND.fullName} Location`}
              src={CONTACT.mapEmbedUrl}
              className="h-full w-full grayscale-[70%] contrast-125"
              loading="lazy"
            />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thanks! A coach will reach out within 24 hours.");
            }}
            className="card-premium p-8"
          >
            <h3 className="font-display text-3xl">Book Your Free Trial</h3>
            <p className="text-white/60 text-sm mt-1">No contracts. No pressure. Just results.</p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <Field label="Full name" placeholder="Rahul Sharma" />
              <Field label="Phone" placeholder="+91 98765 43210" />
              <Field label="Email" type="email" placeholder="you@gmail.com" className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/60">Goal</label>
                <select className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-primary transition">
                  <option>Build muscle</option>
                  <option>Lose fat</option>
                  <option>Get stronger</option>
                  <option>Athletic performance</option>
                  <option>General fitness</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/60">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tell us a bit about where you're starting from…"
                  className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-primary transition resize-none"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-6 w-full">
              Claim My Free {BRAND.trialDays}-Day Trial <ChevronRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs text-white/40 text-center">
              We respect your privacy. No spam, ever.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={className}>
      <label className="text-xs uppercase tracking-widest text-white/60">{label}</label>
      <input
        {...rest}
        className="mt-2 w-full rounded-xl bg-input/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/10 pt-20 pb-8">
      <div className="mx-auto max-w-7xl px-5 grid md:grid-cols-4 gap-10">
        <div>
          <a href="#home" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl tracking-widest">
              {BRAND.namePart1} <span className="text-primary">{BRAND.namePart2}</span>
            </span>
          </a>
          <p className="mt-4 text-sm text-white/60 max-w-xs">
            India's premium strength &amp; weight-lifting club. Where discipline is designed and results are built.
          </p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Facebook, Twitter, Youtube].map((I, i) => (
              <a key={i} aria-label="social" href="#" className="grid h-10 w-10 place-items-center rounded-full glass hover:bg-primary hover:text-white transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-display text-lg tracking-widest">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            {NAV.slice(1, 7).map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-primary transition">{n.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg tracking-widest">Opening Hours</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li className="flex justify-between"><span>Members</span><span className="text-primary">24/7</span></li>
            <li className="flex justify-between"><span>Reception</span><span>6am – 11pm</span></li>
            <li className="flex justify-between"><span>Classes</span><span>6am – 9pm</span></li>
            <li className="flex justify-between"><span>Holidays</span><span>Open</span></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg tracking-widest">Newsletter</h4>
          <p className="mt-4 text-sm text-white/60">Weekly training tips, drops and member-only deals.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); alert("Subscribed!"); }}
            className="mt-4 flex glass rounded-full p-1"
          >
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-white/40"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold hover:brightness-110 transition">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="mt-14 border-t border-white/5 pt-6 mx-auto max-w-7xl px-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
        <div>© {new Date().getFullYear()} {BRAND.fullName}. All rights reserved.</div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-primary">Privacy</a>
          <a href="#" className="hover:text-primary">Terms</a>
          <a href="#" className="hover:text-primary">Cookies</a>
        </div>
      </div>
    </footer>
  );
}
