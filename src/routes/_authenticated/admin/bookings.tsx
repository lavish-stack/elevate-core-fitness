import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/CrudManager";
import { DataTable, type Row } from "@/components/admin/DataTable";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Trainer Bookings — New Fitness Zone Admin" },
      {
        name: "description",
        content:
          "Approve, reject or reschedule trainer sessions booked by members and leave admin notes.",
      },
      { property: "og:title", content: "Trainer Bookings — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage member trainer session bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingsAdmin,
});

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type BookingRow = {
  id: string;
  user_id: string;
  trainer_id: string;
  session_date: string;
  time_slot: string;
  notes: string | null;
  admin_note: string | null;
  status: BookingStatus;
  created_at: string;
};

type BookingUpdate = {
  status?: BookingStatus;
  session_date?: string;
  time_slot?: string;
  admin_note?: string | null;
};

function BookingsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");

  const list = useQuery({
    queryKey: ["admin", "trainer_bookings"],
    queryFn: async () => {
      const [bookings, trainers, profiles] = await Promise.all([
        supabase
          .from("trainer_bookings")
          .select("*")
          .order("session_date", { ascending: false }),
        supabase.from("trainers").select("id,name"),
        supabase.from("profiles").select("id,full_name,phone"),
      ]);
      if (bookings.error) throw new Error(bookings.error.message);
      const tMap = new Map((trainers.data ?? []).map((t) => [t.id, t.name]));
      const pMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      return ((bookings.data ?? []) as BookingRow[]).map((b) => ({
        ...b,
        trainer_name: tMap.get(b.trainer_id) ?? "—",
        member_name: pMap.get(b.user_id)?.full_name ?? "Member",
        member_phone: pMap.get(b.user_id)?.phone ?? "—",
      })) as Row[];
    },
  });

  // Live updates so status changes appear without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainer_bookings" },
        () => void qc.invalidateQueries({ queryKey: ["admin", "trainer_bookings"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: BookingUpdate }) => {
      const { error } = await supabase.from("trainer_bookings").update(values).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Booking updated — the member has been notified.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update booking"),
  });

  const openEdit = (row: Row) => {
    setEditing(row);
    setDate(String(row.session_date ?? ""));
    setSlot(String(row.time_slot ?? ""));
    setNote(String(row.admin_note ?? ""));
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!date || !slot.trim()) {
      toast.error("Please provide both a date and a time slot.");
      return;
    }
    await update.mutateAsync({
      id: String(editing.id),
      values: { session_date: date, time_slot: slot.trim(), admin_note: note.trim() || null },
    });
    setEditing(null);
  };

  return (
    <AdminShell
      title="TRAINER BOOKINGS"
      subtitle="Approve, reject or reschedule member sessions. Every status change notifies the member instantly."
    >
      <DataTable
        rows={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        csvName="trainer-bookings"
        searchKeys={["member_name", "member_phone", "trainer_name", "time_slot", "session_date"]}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["pending", "confirmed", "cancelled", "completed"].map((s) => ({
              value: s,
              label: s,
            })),
          },
        ]}
        emptyTitle="No bookings yet"
        emptyDescription="Member session requests will appear here as soon as they book a trainer."
        bulkActions={[
          { label: "Approve", values: { status: "confirmed" } },
          { label: "Reject", values: { status: "cancelled" } },
          { label: "Mark completed", values: { status: "completed" } },
        ]}
        onBulkUpdate={async (ids, values) => {
          const { error } = await supabase.from("trainer_bookings").update(values as BookingUpdate).in("id", ids);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Bookings updated — members notified.");
          void qc.invalidateQueries({ queryKey: ["admin"] });
        }}
        onBulkDelete={async (ids) => {
          const { error } = await supabase.from("trainer_bookings").delete().in("id", ids);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Bookings deleted");
          void qc.invalidateQueries({ queryKey: ["admin"] });
        }}
        columns={[
          {
            key: "member_name",
            label: "Member",
            render: (r) => (
              <div>
                <div className="font-semibold">{String(r.member_name)}</div>
                <div className="text-xs text-white/40">{String(r.member_phone)}</div>
              </div>
            ),
          },
          { key: "trainer_name", label: "Trainer" },
          {
            key: "session_date",
            label: "Session",
            render: (r) => (
              <div>
                <div>{new Date(String(r.session_date)).toLocaleDateString("en-IN")}</div>
                <div className="text-xs text-white/40">{String(r.time_slot)}</div>
              </div>
            ),
          },
          {
            key: "notes",
            label: "Notes",
            render: (r) => (
              <div className="max-w-[16rem]">
                <p className="text-white/70">{r.notes ? String(r.notes) : "—"}</p>
                {r.admin_note ? (
                  <p className="mt-1 text-xs text-primary">Admin: {String(r.admin_note)}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <select
                value={String(r.status)}
                aria-label="Booking status"
                onChange={(e) =>
                  update.mutate({ id: String(r.id), values: { status: e.target.value as BookingStatus } })
                }
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-widest text-primary outline-none focus:border-primary/60"
              >
                {["pending", "confirmed", "cancelled", "completed"].map((s) => (
                  <option key={s} value={s} className="bg-background text-white">
                    {s}
                  </option>
                ))}
              </select>
            ),
          },
        ]}
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => update.mutate({ id: String(row.id), values: { status: "confirmed" } })}
              className="btn-ghost !py-2 !px-3 text-xs"
            >
              Approve
            </button>
            <button
              onClick={() => update.mutate({ id: String(row.id), values: { status: "cancelled" } })}
              className="btn-ghost !py-2 !px-3 text-xs"
            >
              Reject
            </button>
            <button onClick={() => openEdit(row)} className="btn-ghost !py-2 !px-3 text-xs">
              Reschedule
            </button>
          </div>
        )}
      />

      {editing && (
        <Modal title="Reschedule booking" onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                Session date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">Time slot</span>
              <input
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="06:00 AM"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                Admin note (shared with the member)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void saveEdit()}
              disabled={update.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
