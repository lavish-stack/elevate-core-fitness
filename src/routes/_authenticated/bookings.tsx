import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MemberHeader } from "@/components/member/MemberHeader";
import { EmptyState, SkeletonBlock, SkeletonRows } from "@/components/gym/States";
import { useTrainers } from "@/lib/site-data";
import { Modal } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Book a Trainer — New Fitness Zone" },
      {
        name: "description",
        content:
          "Book a one-to-one session with a New Fitness Zone coach, pick an available time slot and track your booking status.",
      },
      { property: "og:title", content: "Book a Trainer — New Fitness Zone" },
      { property: "og:description", content: "Pick your coach, date and time slot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Next 21 bookable days. */
function useDays() {
  return useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, []);
}

const STATUS_TONE: Record<string, string> = {
  pending: "text-white/60",
  confirmed: "text-primary",
  cancelled: "text-white/40",
  completed: "text-primary",
};

function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { trainers, isLoading: trainersLoading } = useTrainers();
  const days = useDays();

  const dbTrainers = trainers.filter((t) => !t.id.startsWith("static-"));
  const [trainerId, setTrainerId] = useState<string>("");
  const [date, setDate] = useState<string>(iso(days[0]!));
  const [slot, setSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const activeTrainer = trainerId || dbTrainers[0]?.id || "";
  const weekday = new Date(`${date}T12:00:00`).getDay();

  const availability = useQuery({
    queryKey: ["availability", activeTrainer, weekday],
    enabled: Boolean(activeTrainer),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_availability")
        .select("time_slot")
        .eq("trainer_id", activeTrainer)
        .eq("weekday", weekday)
        .eq("is_active", true)
        .order("time_slot", { ascending: true });
      if (error) throw new Error(error.message);
      return data.map((r) => r.time_slot);
    },
  });

  const taken = useQuery({
    queryKey: ["booked_slots", activeTrainer, date],
    enabled: Boolean(activeTrainer),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("time_slot,status")
        .eq("trainer_id", activeTrainer)
        .eq("session_date", date)
        .in("status", ["pending", "confirmed"]);
      if (error) throw new Error(error.message);
      return data.map((r) => r.time_slot);
    },
  });

  const myBookings = useQuery({
    queryKey: ["my_bookings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("id,trainer_id,session_date,time_slot,status,notes,admin_note,created_at")
        .order("session_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!activeTrainer) throw new Error("Please choose a trainer.");
      if (!slot) throw new Error("Please choose a time slot.");
      const { error } = await supabase.from("trainer_bookings").insert({
        user_id: user!.id,
        trainer_id: activeTrainer,
        session_date: date,
        time_slot: slot,
        notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      });
      if (error) {
        throw new Error(
          error.code === "23505" || error.message.includes("duplicate")
            ? "That slot has just been taken. Please pick another one."
            : error.message,
        );
      }
    },
    onSuccess: () => {
      toast.success("Booking requested — you'll be notified once it's approved.");
      setSlot("");
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["my_bookings"] });
      void qc.invalidateQueries({ queryKey: ["booked_slots"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not book"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trainer_bookings")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      setCancelId(null);
      void qc.invalidateQueries({ queryKey: ["my_bookings"] });
      void qc.invalidateQueries({ queryKey: ["booked_slots"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel"),
  });

  const trainerName = (id: string) => dbTrainers.find((t) => t.id === id)?.name ?? "Coach";
  const slots = availability.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <h1 className="font-display mt-4 text-5xl md:text-6xl leading-[0.95]">
          BOOK A <span className="text-gradient-red">TRAINER</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/60">
          Choose your coach, pick a date and an open slot. Our team approves every request.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="card-premium p-7 lg:col-span-2">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">1 · Select trainer</div>
            {trainersLoading ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
            ) : dbTrainers.length === 0 ? (
              <p className="mt-5 text-sm text-white/50">
                Trainer profiles are being set up. Please check back soon.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {dbTrainers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTrainerId(t.id);
                      setSlot("");
                    }}
                    aria-pressed={activeTrainer === t.id}
                    className={`glass flex items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                      activeTrainer === t.id ? "border border-primary/60" : "border border-white/10"
                    }`}
                  >
                    <img
                      src={t.img}
                      alt={t.name}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      <span className="block truncate text-[10px] uppercase tracking-widest text-white/45">
                        {t.role}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 text-xs uppercase tracking-[0.25em] text-white/50">2 · Pick a date</div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const key = iso(d);
                const active = key === date;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setDate(key);
                      setSlot("");
                    }}
                    aria-pressed={active}
                    className={`glass shrink-0 rounded-2xl px-4 py-3 text-center transition-colors ${
                      active ? "border border-primary/60 text-primary" : "border border-white/10 text-white/70"
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-widest">
                      {d.toLocaleDateString("en-IN", { weekday: "short" })}
                    </span>
                    <span className="font-display block text-xl">{d.getDate()}</span>
                    <span className="block text-[10px] text-white/40">
                      {d.toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 text-xs uppercase tracking-[0.25em] text-white/50">
              3 · Available time slots
            </div>
            {availability.isLoading || taken.isLoading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <SkeletonBlock className="h-12" />
                <SkeletonBlock className="h-12" />
                <SkeletonBlock className="h-12" />
                <SkeletonBlock className="h-12" />
              </div>
            ) : slots.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">
                This coach isn't available on the selected day. Try another date.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {slots.map((s) => {
                  const isTaken = (taken.data ?? []).includes(s);
                  return (
                    <button
                      key={s}
                      disabled={isTaken}
                      onClick={() => setSlot(s)}
                      aria-pressed={slot === s}
                      className={`glass rounded-2xl px-3 py-3 text-sm transition-colors ${
                        isTaken
                          ? "cursor-not-allowed border border-white/5 text-white/25 line-through"
                          : slot === s
                            ? "border border-primary/60 text-primary"
                            : "border border-white/10 text-white/80"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            <label htmlFor="notes" className="mt-8 block text-xs uppercase tracking-[0.25em] text-white/50">
              4 · Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals, injuries or anything your coach should know."
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
            />

            <button
              onClick={() => book.mutate()}
              disabled={book.isPending || !slot || !activeTrainer}
              className="btn-primary mt-6 !py-3 !px-6 text-sm disabled:opacity-50"
            >
              {book.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              Request session
            </button>
          </section>

          <section className="card-premium p-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">My bookings</div>
            {myBookings.isLoading ? (
              <div className="mt-5">
                <SkeletonRows rows={3} />
              </div>
            ) : (myBookings.data?.length ?? 0) === 0 ? (
              <p className="mt-5 text-sm text-white/50">No sessions booked yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {myBookings.data!.map((b) => (
                  <li key={b.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{trainerName(b.trainer_id)}</span>
                      <span
                        className={`text-[10px] uppercase tracking-widest ${STATUS_TONE[b.status] ?? "text-white/60"}`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {new Date(b.session_date).toLocaleDateString("en-IN")} · {b.time_slot}
                    </div>
                    {b.admin_note && (
                      <p className="mt-2 text-xs text-white/60">Note: {b.admin_note}</p>
                    )}
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <button
                        onClick={() => setCancelId(b.id)}
                        className="mt-3 text-[10px] uppercase tracking-widest text-primary"
                      >
                        Cancel booking
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {dbTrainers.length === 0 && !trainersLoading && (
          <div className="mt-8">
            <EmptyState
              title="NO COACHES AVAILABLE"
              description="Bookings open as soon as trainer profiles are published."
            />
          </div>
        )}

        {cancelId && (
          <Modal title="Cancel this booking?" onClose={() => setCancelId(null)}>
            <p className="text-sm text-white/60">
              The slot will be released for other members. You can book again anytime.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setCancelId(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
                Keep booking
              </button>
              <button
                onClick={() => cancel.mutate(cancelId)}
                disabled={cancel.isPending}
                className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
              >
                {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Cancel booking
              </button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
