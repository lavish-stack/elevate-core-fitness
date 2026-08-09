import { useState, type ComponentType, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CreditCard,
  Dumbbell,
  FileCheck,
  Loader2,
  Pencil,
  RefreshCcw,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/CrudManager";
import { ErrorState, SkeletonBlock } from "@/components/gym/States";
import { formatINR } from "@/lib/site-data";
import { getMemberDetail } from "@/lib/members-admin.functions";
import { adminActivateMembership } from "@/lib/admin-membership.functions";

export const Route = createFileRoute("/_authenticated/admin/members/$memberId")({
  head: () => ({
    meta: [
      { title: "Member Detail — New Fitness Zone Admin" },
      {
        name: "description",
        content: "Full membership, payment and booking history for a New Fitness Zone member.",
      },
      { property: "og:title", content: "Member Detail — New Fitness Zone Admin" },
      { property: "og:description", content: "Admin member detail for New Fitness Zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberDetailPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (from: Date, days: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
};
const inDate = (v: string) => new Date(v).toLocaleDateString("en-IN");

type PlanRow = { id: string; name: string; price_inr: number; duration_days: number };

function MemberDetailPage() {
  const { memberId } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getMemberDetail);
  const activateMembership = useServerFn(adminActivateMembership);

  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(iso(new Date()));
  const [expiresAt, setExpiresAt] = useState("");

  const detail = useQuery({
    queryKey: ["admin", "member", memberId],
    queryFn: () => fetchDetail({ data: { userId: memberId } }),
  });

  const plans = useQuery({
    queryKey: ["admin", "membership_plans", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("id,name,price_inr,duration_days")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as PlanRow[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "member", memberId] });
    void qc.invalidateQueries({ queryKey: ["admin", "members"] });
  };

  const openEdit = () => {
    setFullName(detail.data?.profile.fullName ?? "");
    setPhone(detail.data?.profile.phone ?? "");
    setEditOpen(true);
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      // Same RLS-backed update path the member's own profile page uses — the
      // existing "update own profile" policy already includes admins.
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
        .eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update profile"),
  });

  const openRenew = () => {
    const firstPlan = detail.data?.currentMembership?.planId || plans.data?.[0]?.id || "";
    setPlanId(firstPlan);
    const start = new Date();
    setStartsAt(iso(start));
    const days = plans.data?.find((p) => p.id === firstPlan)?.duration_days ?? 30;
    setExpiresAt(iso(addDays(start, days)));
    setRenewOpen(true);
  };

  const onPlanChange = (id: string) => {
    setPlanId(id);
    const days = plans.data?.find((p) => p.id === id)?.duration_days ?? 30;
    setExpiresAt(iso(addDays(new Date(startsAt || iso(new Date())), days)));
  };

  const renew = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error("Please choose a membership plan.");
      if (!startsAt || !expiresAt) throw new Error("Please set both start and expiry dates.");
      if (expiresAt <= startsAt) throw new Error("Expiry date must be after the start date.");
      // Reuses the shared activation function used by the Razorpay flow and
      // the Membership Requests page — no second activation implementation.
      await activateMembership({
        data: {
          userId: memberId,
          planId,
          startsAt,
          expiresAt,
          existingMembershipId: detail.data?.currentMembership?.id ?? null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Membership renewed and activated");
      setRenewOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not renew membership"),
  });

  const cancelMembership = useMutation({
    mutationFn: async () => {
      const id = detail.data?.currentMembership?.id;
      if (!id) return;
      // Same single-field status update the Membership Requests cancellation
      // branch performs, allowed for admins by existing RLS.
      const { error } = await supabase.from("memberships").update({ status: "cancelled" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Membership cancelled");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel membership"),
  });

  return (
    <AdminShell title="MEMBER DETAIL" subtitle="Full profile, membership, payment and booking history.">
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to members
      </Link>

      {detail.isPending && (
        <div className="mt-6">
          <SkeletonBlock className="h-64" />
        </div>
      )}

      {detail.isError && (
        <div className="mt-6">
          <ErrorState
            description={detail.error instanceof Error ? detail.error.message : "Could not load member."}
            onRetry={() => void detail.refetch()}
          />
        </div>
      )}

      {detail.data && (
        <div className="mt-6 space-y-8">
          <Section
            icon={User}
            title="Profile"
            action={
              <button onClick={openEdit} className="btn-ghost !py-2 !px-3 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Name" value={detail.data.profile.fullName || "—"} />
              <Field label="Email" value={detail.data.profile.email || "—"} />
              <Field label="Phone" value={detail.data.profile.phone || "—"} />
              <Field label="Joined" value={inDate(detail.data.profile.joinDate)} />
            </div>
          </Section>

          <Section
            icon={CreditCard}
            title="Current Membership"
            action={
              <div className="flex gap-2">
                <button onClick={openRenew} className="btn-ghost !py-2 !px-3 text-xs">
                  <RefreshCcw className="h-3.5 w-3.5" /> Renew
                </button>
                {detail.data.currentMembership?.status === "active" && (
                  <button
                    onClick={() => {
                      if (confirm("Cancel this member's active membership?")) cancelMembership.mutate();
                    }}
                    disabled={cancelMembership.isPending}
                    className="btn-ghost !py-2 !px-3 text-xs disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            }
          >
            {detail.data.currentMembership ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Plan" value={detail.data.currentMembership.planName} />
                <Field label="Price" value={`₹${formatINR(detail.data.currentMembership.amountInr)}`} />
                <Field label="Status" value={detail.data.currentMembership.status} />
                <Field label="Start date" value={inDate(detail.data.currentMembership.startsAt)} />
                <Field label="Expiry date" value={inDate(detail.data.currentMembership.expiresAt)} />
                <Field
                  label="Remaining days"
                  value={String(detail.data.currentMembership.remainingDays)}
                />
                <Field label="Card code" value={detail.data.currentMembership.cardCode} mono />
              </div>
            ) : (
              <p className="text-sm text-white/50">No membership on record. Use “Renew” to create one.</p>
            )}
          </Section>

          <Section icon={CalendarClock} title="Membership History">
            <HistoryTable
              rows={detail.data.membershipHistory}
              empty="No memberships yet."
              columns={[
                { label: "Plan", render: (m) => m.planName },
                { label: "Amount", render: (m) => `₹${formatINR(m.amountInr)}` },
                { label: "Status", render: (m) => m.status },
                { label: "Start", render: (m) => inDate(m.startsAt) },
                { label: "Expiry", render: (m) => inDate(m.expiresAt) },
                { label: "Last updated", render: (m) => inDate(m.updatedAt) },
              ]}
            />
          </Section>

          <Section icon={CreditCard} title="Payment History">
            <HistoryTable
              rows={detail.data.paymentHistory}
              empty="No payment records yet."
              columns={[
                { label: "Amount", render: (p) => `₹${formatINR(p.amountInr)}` },
                { label: "Date", render: (p) => inDate(p.createdAt) },
                { label: "Status", render: (p) => p.status },
                { label: "Provider", render: (p) => p.provider },
                { label: "Order ID", render: (p) => p.providerOrderId || "—" },
                { label: "Payment ID", render: (p) => p.providerPaymentId || "—" },
                { label: "Plan", render: (p) => p.planName || "—" },
              ]}
            />
          </Section>

          <Section icon={Dumbbell} title="Booking History">
            <HistoryTable
              rows={detail.data.bookingHistory}
              empty="No trainer bookings yet."
              columns={[
                { label: "Trainer", render: (b) => b.trainerName },
                { label: "Date", render: (b) => inDate(b.sessionDate) },
                { label: "Slot", render: (b) => b.timeSlot },
                { label: "Status", render: (b) => b.status },
              ]}
            />
          </Section>

          <Section icon={FileCheck} title="Membership Requests">
            <HistoryTable
              rows={detail.data.membershipRequests}
              empty="No membership requests yet."
              columns={[
                { label: "Type", render: (r) => r.type },
                { label: "Plan", render: (r) => r.planName || "—" },
                { label: "Status", render: (r) => r.status },
                { label: "Requested", render: (r) => inDate(r.createdAt) },
                { label: "Admin notes", render: (r) => r.adminNote || "—" },
              ]}
            />
          </Section>
        </div>
      )}

      {editOpen && (
        <Modal title="Edit member profile" onClose={() => setEditOpen(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setEditOpen(false)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </Modal>
      )}

      {renewOpen && (
        <Modal title="Renew / activate membership" onClose={() => setRenewOpen(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">Plan</span>
              <select
                value={planId}
                onChange={(e) => onPlanChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              >
                <option value="" className="bg-background">
                  Select a plan
                </option>
                {(plans.data ?? []).map((p) => (
                  <option key={p.id} value={p.id} className="bg-background text-white">
                    {p.name} — ₹{p.price_inr} / {p.duration_days} days
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Start date</span>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Expiry date</span>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setRenewOpen(false)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => renew.mutate()}
              disabled={renew.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {renew.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Activate
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 text-white/85 ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function HistoryTable<T>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: { label: string; render: (row: T) => ReactNode }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-white/50">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
            {columns.map((c) => (
              <th key={c.label} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {columns.map((c) => (
                <td key={c.label} className="px-3 py-2.5 align-top text-white/80">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
