import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, LayoutDashboard, Settings, Users, Images, CreditCard, Activity, Quote, HelpCircle, Mail, ClipboardList, LogOut, ExternalLink, Menu, X, CalendarCheck, Clock, Inbox } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/lib/site-data";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/settings", label: "Website Settings", icon: Settings },
  { to: "/admin/trainers", label: "Trainers", icon: Users },
  { to: "/admin/availability", label: "Trainer Availability", icon: Clock },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/requests", label: "Membership Requests", icon: Inbox },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
  { to: "/admin/plans", label: "Membership Plans", icon: CreditCard },
  { to: "/admin/programs", label: "Programs", icon: Activity },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { to: "/admin/messages", label: "Contact Messages", icon: Mail },
  { to: "/admin/trials", label: "Trial Registrations", icon: ClipboardList },
] as const;


export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const { settings } = useSiteSettings();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to || path === `${to}/` : path.startsWith(to);

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(item.to, "exact" in item ? item.exact : false);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle admin menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-lg sm:text-xl tracking-widest">
                {settings.name_part1} <span className="text-primary">{settings.name_part2}</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex rounded-full bg-primary/15 px-3 py-1 text-[10px] uppercase tracking-widest text-primary">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-4 text-sm">
              <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">View site</span>
            </a>
            <button onClick={signOut} className="btn-ghost !py-2 !px-4 text-sm">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:flex lg:gap-8">
        {open && <div className="lg:hidden mb-6 card-premium p-3">{nav}</div>}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="card-premium p-3 sticky top-24">{nav}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Admin Panel</span>
          <h1 className="font-display mt-3 text-4xl md:text-5xl leading-[0.95]">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-white/60 max-w-2xl">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
