import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/CrudManager";
import { DataTable, type Row } from "@/components/admin/DataTable";
import { adminActivateMembership } from "@/lib/admin-membership.functions";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({
    meta: [
      { title: "Membership Requests — New Fitness Zone Admin" },
      {
        name: "description",
        content:
          "Approve, reject and activate member requests for new memberships, renewals and cancellations.",
      },
      { property: "og:title", content: "Membership Requests — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage membership, renewal and cancellation requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestsAdmin,
});

type RequestStatus = "pending" | "approved" | "rejected";
type RequestType = "new" | "renewal" | "cancellation";

type RequestRow = {
  id: string;
  user_id: string;
  membership_id: string | null;
  plan_id: string | null;
  type: RequestType;
  status: RequestStatus;
  note: string | null;
  admin_note: string | null;
  created_at: string;
};

type PlanRow = {
  id: string;
  name: string;
  price_inr: number;
  duration_days: number;
};

const addDays = (from: Date, days: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

function RequestsAdmin() {
  const qc = useQueryClient();
  const activateMembership = useServerFn(adminActivateMembership);
  const [active, setActive] = useState<Row | null>(null);
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(iso(new Date()));
  const [expiresAt, setExpiresAt] = useState("");
  const [remark, setRemark] = useState("");

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

  const list = useQuery({
    queryKey: ["admin", "membership_requests"],
    queryFn: async () => {
      const [requests, profiles, memberships] = await Promise.all([
        supabase.from("membership_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name,phone"),
        supabase.from("memberships").select("id,plan_name,status,expires_at"),
      ]);
      if (requests.error) throw new Error(requests.error.message);
      const pMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const mMap = new Map((memberships.data ?? []).map((m) => [m.id, m]));
      return ((requests.data ?? []) as RequestRow[]).map((r) => {
        const m = r.membership_id ? mMap.get(r.membership_id) : undefined;
        return {
          ...r,
          member_name: pMap.get(r.user_id)?.full_name ?? "Member",
          member_phone: pMap.get(r.user_id)?.phone ?? "—",
          membership_label: m ? `${m.plan_name} · ${m.status} · till ${m.expires_at}` : "—",
        };
      }) as Row[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-membership-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_requests" },
        () => void qc.invalidateQueries({ queryKey: ["admin", "membership_requests"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin"] });

  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note,
    }: {
      id: string;
      status: RequestStatus;
      admin_note?: string | null;
    }) => {
      const { error } = await supabase
        .from("membership_requests")
        .update({ status, admin_note: admin_note ?? null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Request updated — the member has been notified.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update request"),
  });

  /** Approves a request and applies it to the member's membership record. */
  const process = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const row = active as unknown as RequestRow & { id: string };
      const note = remark.trim() || null;

      if (row.type === "cancellation") {
        if (row.membership_id) {
          const { error } = await supabase
            .from("memberships")
            .update({ status: "cancelled" })
            .eq("id", row.membership_id);
          if (error) throw new Error(error.message);
        }
      } else {
        const plan = plans.data?.find((p) => p.id === planId);
        if (!plan) throw new Error("Please choose a membership plan.");
        if (!startsAt || !expiresAt) throw new Error("Please set both start and expiry dates.");
        if (expiresAt <= startsAt) throw new Error("Expiry date must be after the start date.");

        // Delegates to the same shared activation function the verified
        // Razorpay payment path uses (membership-activation.server.ts), so
        // the "how does a membership get created/renewed" business rule is
        // defined once, not duplicated between admin approval and payments.
        await activateMembership({
          data: {
            userId: row.user_id,
            planId: plan.id,
            startsAt,
            expiresAt,
            existingMembershipId: row.type === "renewal" ? row.membership_id : null,
          },
        });
      }

      const { error } = await supabase
        .from("membership_requests")
        .update({ status: "approved", admin_note: note })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Request approved — the membership is updated and the member notified.");
      setActive(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not process request"),
  });

  const openProcess = (row: Row) => {
    setActive(row);
    setRemark(String(row.admin_note ?? ""));
    const firstPlan = (row.plan_id ? String(row.plan_id) : "") || plans.data?.[0]?.id || "";
    setPlanId(firstPlan);
    const start = new Date();
    setStartsAt(iso(start));
    const days = plans.data?.find((p) => p.id === firstPlan)?.duration_days ?? 30;
    setExpiresAt(iso(addDays(start, days)));
  };

  const onPlanChange = (id: string) => {
    setPlanId(id);
    const days = plans.data?.find((p) => p.id === id)?.duration_days ?? 30;
    setExpiresAt(iso(addDays(new Date(startsAt || iso(new Date())), days)));
  };

  const isCancellation = active ? String(active.type) === "cancellation" : false;

  return (
    <AdminShell
      title="MEMBERSHIP REQUESTS"
      subtitle="Approve, reject and activate new memberships, renewals and cancellations. Members are notified automatically."
    >
      <DataTable
        rows={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        csvName="membership-requests"
        searchKeys={["member_name", "member_phone", "note", "membership_label"]}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["pending", "approved", "rejected"].map((s) => ({ value: s, label: s })),
          },
          {
            key: "type",
            label: "Type",
            options: ["new", "renewal", "cancellation"].map((s) => ({ value: s, label: s })),
          },
        ]}
        emptyTitle="No membership requests"
        emptyDescription="Renewal, cancellation and new membership requests from members will appear here."
        onBulkDelete={async (ids) => {
          const { error } = await supabase.from("membership_requests").delete().in("id", ids);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Requests deleted");
          invalidate();
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
          {
            key: "type",
            label: "Type",
            render: (r) => (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] uppercase tracking-widest text-primary">
                {String(r.type)}
              </span>
            ),
          },
          { key: "membership_label", label: "Current membership" },
          {
            key: "note",
            label: "Notes",
            render: (r) => (
              <div className="max-w-[16rem]">
                <p className="text-white/70">{r.note ? String(r.note) : "—"}</p>
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
              <span className="text-xs uppercase tracking-widest text-white/70">
                {String(r.status)}
              </span>
            ),
          },
          {
            key: "created_at",
            label: "Requested",
            render: (r) => (
              <span className="text-white/50">
                {new Date(String(r.created_at)).toLocaleDateString("en-IN")}
              </span>
            ),
          },
        ]}
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <button onClick={() => openProcess(row)} className="btn-ghost !py-2 !px-3 text-xs">
              {String(row.type) === "cancellation" ? "Cancel membership" : "Approve & activate"}
            </button>
            <button
              onClick={() => decide.mutate({ id: String(row.id), status: "rejected" })}
              className="btn-ghost !py-2 !px-3 text-xs"
            >
              Reject
            </button>
          </div>
        )}
      />

      {active && (
        <Modal
          title={isCancellation ? "Cancel membership" : "Approve & activate membership"}
          onClose={() => setActive(null)}
        >
          <div className="space-y-4">
            {!isCancellation && (
              <>
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
                    <span className="text-[10px] uppercase tracking-widest text-white/50">
                      Start date
                    </span>
                    <input
                      type="date"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-white/50">
                      Expiry date
                    </span>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
                    />
                  </label>
                </div>
              </>
            )}
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                Admin remark (shared with the member)
              </span>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setActive(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Close
            </button>
            <button
              onClick={() => process.mutate()}
              disabled={process.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {process.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCancellation ? "Confirm cancellation" : "Approve & activate"}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
