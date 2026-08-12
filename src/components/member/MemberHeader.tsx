import { Link } from "@tanstack/react-router";
import { CalendarCheck, Dumbbell, IdCard, LogOut, ShieldCheck, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/lib/site-data";

/** Shared member-area header — identical styling to the original dashboard header. */
export function MemberHeader() {
  const { isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();

  return (
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/bookings"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:text-primary"
          >
            <CalendarCheck className="h-3.5 w-3.5" /> Bookings
          </Link>
          <Link
            to="/profile"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:text-primary"
          >
            <User className="h-3.5 w-3.5" /> Profile
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary transition-colors hover:bg-primary/25"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Admin Panel</span>
            </Link>
          )}
          <NotificationBell scope="user" />
          <button onClick={signOut} className="btn-ghost !py-2 !px-4 text-sm">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
