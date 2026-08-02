import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotifications, type NotificationScope } from "@/lib/notifications";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

export function NotificationBell({ scope = "user" }: { scope?: NotificationScope }) {
  const { items, unread, isLoading, markRead, markAllRead, remove } = useNotifications(scope);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-white/10 p-2 text-white/70 transition-colors hover:border-primary/50 hover:text-primary"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="card-premium absolute right-0 z-50 mt-3 w-[min(92vw,22rem)] p-3"
        >
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50">
              Notifications
            </span>
            <button
              onClick={() => markAllRead.mutate()}
              disabled={!unread || markAllRead.isPending}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center gap-2 px-2 py-6 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-white/40">
                You're all caught up. Nothing here yet.
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`glass rounded-2xl p-3 ${n.is_read ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{n.title}</div>
                    <p className="mt-0.5 text-xs text-white/60">{n.body}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/35">
                      <span>{timeAgo(n.created_at)}</span>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => {
                            if (!n.is_read) markRead.mutate(n.id);
                            setOpen(false);
                          }}
                          className="text-primary"
                        >
                          View
                        </Link>
                      )}
                      {!n.is_read && (
                        <button onClick={() => markRead.mutate(n.id)} className="text-white/50">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove.mutate(n.id)}
                    className="shrink-0 text-white/40 hover:text-primary"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
