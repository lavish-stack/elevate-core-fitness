import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/gym/States";
import { formatINR } from "@/lib/site-data";
import { exportMembers, listMembers } from "@/lib/members-admin.functions";
import type { MemberSort, MemberStatus } from "@/lib/members-admin.types";

export const Route = createFileRoute("/_authenticated/admin/members/")({
  head: () => ({
    meta: [
      { title: "Members — New Fitness Zone Admin" },
      {
        name: "description",
        content:
          "Search, filter and manage every New Fitness Zone member, their membership status and history.",
      },
      { property: "og:title", content: "Members — New Fitness Zone Admin" },
      { property: "og:description", content: "Admin members management for New Fitness Zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MembersAdmin,
});

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  cancelled: "Cancelled",
  no_membership: "No Active Membership",
};

const STATUS_TONE: Record<MemberStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  expiring_soon: "bg-amber-500/15 text-amber-400",
  expired: "bg-primary/15 text-primary",
  cancelled: "bg-white/10 text-white/60",
  no_membership: "bg-white/10 text-white/40",
};

const SORTS: { value: MemberSort; label: string }[] = [
  { value: "joined_desc", label: "Newest first" },
  { value: "joined_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "expiry_asc", label: "Expiry soonest" },
  { value: "expiry_desc", label: "Expiry latest" },
];

const inDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");
const csvEsc = (s: string) => `"${s.replace(/"/g, '""')}"`;

const PAGE_SIZE = 20;

function MembersAdmin() {
  const fetchMembers = useServerFn(listMembers);
  const fetchExport = useServerFn(exportMembers);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus | "">("");
  const [planId, setPlanId] = useState("");
  const [sort, setSort] = useState<MemberSort>("joined_desc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(
    () => ({ search, status, planId, sort, page, pageSize: PAGE_SIZE }),
    [search, status, planId, sort, page],
  );

  const query = useQuery({
    queryKey: ["admin", "members", filters],
    queryFn: () => fetchMembers({ data: filters }),
  });

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalFiltered / data.pageSize)) : 1;

  const kpiCards = data
    ? [
        { label: "Total members", value: data.kpis.totalMembers, icon: Users },
        { label: "Active members", value: data.kpis.activeMembers, icon: UserCheck },
        { label: "Expiring in 7 days", value: data.kpis.expiringIn7Days, icon: AlertTriangle },
        { label: "Expiring in 30 days", value: data.kpis.expiringIn30Days, icon: Calendar },
        { label: "Expired members", value: data.kpis.expiredMembers, icon: UserX },
        {
          label: "Without active membership",
          value: data.kpis.membersWithoutActiveMembership,
          icon: UserX,
        },
        { label: "New this month", value: data.kpis.newMembersThisMonth, icon: UserPlus },
        { label: "Renewals this month", value: data.kpis.renewalsThisMonth, icon: BarChart3 },
        {
          label: "Revenue this month",
          value: `₹${formatINR(data.kpis.revenueThisMonthInr)}`,
          icon: CreditCard,
        },
      ]
    : [];

  const combinedByMonth = (data?.analytics.newMembersByMonth ?? []).map((row, i) => ({
    month: row.month,
    "New members": row.count,
    Renewals: data?.analytics.renewalsByMonth[i]?.count ?? 0,
  }));

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchExport({ data: { search, status, planId, sort } });
      const head = [
        "Name",
        "Email",
        "Phone",
        "Plan",
        "Status",
        "Start Date",
        "Expiry Date",
        "Remaining Days",
        "Last Payment Date",
        "Last Payment Amount",
      ];
      const csv = [
        head.map(csvEsc).join(","),
        ...rows.map((r) =>
          [
            r.name,
            r.email,
            r.phone,
            r.plan,
            r.status,
            r.startDate,
            r.expiryDate,
            r.remainingDays,
            r.lastPaymentDate,
            r.lastPaymentAmount,
          ]
            .map(csvEsc)
            .join(","),
        ),
      ].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export members");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminShell
      title="MEMBERS"
      subtitle="Search, filter and manage every member — memberships, payments, bookings and requests in one place."
    >
      {query.isError && (
        <ErrorState
          description={query.error instanceof Error ? query.error.message : "Could not load members."}
          onRetry={() => void query.refetch()}
        />
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kpiCards.map((c) => (
              <div key={c.label} className="card-premium p-5">
                <div className="flex items-start justify-between">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">{c.label}</div>
                  <c.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display mt-3 text-3xl">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                New members vs renewals (6 months)
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="New members" fill="oklch(0.62 0.24 25)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Renewals" fill="rgba(255,255,255,0.35)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                Revenue by month (paid only)
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.analytics.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: number) => [`₹${formatINR(v)}`, "Revenue"]}
                    />
                    <Bar dataKey="amountInr" name="Revenue" fill="oklch(0.62 0.24 25)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">Plan distribution</div>
              <div className="mt-4 space-y-3">
                {data.analytics.planDistribution.length === 0 && (
                  <p className="text-sm text-white/40">No active memberships yet.</p>
                )}
                {data.analytics.planDistribution.map((p) => {
                  const max = data.analytics.planDistribution[0]?.count || 1;
                  return (
                    <div key={p.planName}>
                      <div className="flex justify-between text-sm text-white/70">
                        <span>{p.planName}</span>
                        <span className="text-white/50">{p.count}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (p.count / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                Active vs. everything else
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Stat label="Active" value={data.analytics.activeVsExpired.active} tone="text-emerald-400" />
                <Stat label="Expired" value={data.analytics.activeVsExpired.expired} tone="text-primary" />
                <Stat
                  label="Cancelled"
                  value={data.analytics.activeVsExpired.cancelled}
                  tone="text-white/60"
                />
                <Stat
                  label="No membership"
                  value={data.analytics.activeVsExpired.noMembership}
                  tone="text-white/40"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email or phone…"
              aria-label="Search members"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-primary/60"
            />
          </div>

          <select
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as MemberStatus | "");
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 outline-none focus:border-primary/60"
          >
            <option value="" className="bg-background">
              Status: all
            </option>
            {(Object.keys(STATUS_LABEL) as MemberStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background">
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <select
            aria-label="Plan"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 outline-none focus:border-primary/60"
          >
            <option value="" className="bg-background">
              Plan: all
            </option>
            {(data?.plans ?? []).map((p) => (
              <option key={p.id} value={p.id} className="bg-background">
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as MemberSort);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 outline-none focus:border-primary/60"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} className="bg-background">
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void downloadCsv()}
            disabled={exporting}
            className="btn-ghost !py-2.5 !px-4 text-sm disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV
          </button>
        </div>

        <div className="mt-5">
          {query.isPending ? (
            <SkeletonRows rows={6} />
          ) : (data?.members.length ?? 0) === 0 ? (
            <EmptyState
              title="No members found"
              description="Try a different search term, or clear the status and plan filters."
            />
          ) : (
            <>
              <div className="card-premium overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
                      {[
                        "Member",
                        "Phone",
                        "Joined",
                        "Plan",
                        "Status",
                        "Start",
                        "Expiry",
                        "Days left",
                        "Last payment",
                        "Bookings",
                        "",
                      ].map((h, i) => (
                        <th key={i} className="px-5 py-4 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.members ?? []).map((m) => (
                      <tr key={m.userId} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-4 align-top">
                          <div className="text-white/90">{m.fullName || "—"}</div>
                          <div className="text-xs text-white/40">{m.email || "—"}</div>
                        </td>
                        <td className="px-5 py-4 align-top text-white/70">{m.phone || "—"}</td>
                        <td className="px-5 py-4 align-top text-white/60">{inDate(m.joinDate)}</td>
                        <td className="px-5 py-4 align-top text-white/80">{m.planName || "—"}</td>
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${STATUS_TONE[m.status]}`}
                          >
                            {STATUS_LABEL[m.status]}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-white/60">{inDate(m.startsAt)}</td>
                        <td className="px-5 py-4 align-top text-white/60">{inDate(m.expiresAt)}</td>
                        <td className="px-5 py-4 align-top">
                          {m.remainingDays === null ? (
                            <span className="text-white/30">—</span>
                          ) : (
                            <span className={m.remainingDays <= 7 ? "text-primary" : "text-white/70"}>
                              {m.remainingDays}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          {m.lastPaymentAmount === null ? (
                            <span className="text-white/30">—</span>
                          ) : (
                            <div>
                              <div className="text-white/80">₹{formatINR(m.lastPaymentAmount)}</div>
                              <div className="text-xs text-white/40">{inDate(m.lastPaymentDate)}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-white/70">{m.bookingCount}</td>
                        <td className="px-5 py-4 align-top">
                          <Link
                            to="/admin/members/$memberId"
                            params={{ memberId: m.userId }}
                            className="btn-ghost !py-2 !px-3 text-xs"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
                <span>
                  Showing {(data!.page - 1) * data!.pageSize + 1}–
                  {Math.min(data!.totalFiltered, data!.page * data!.pageSize)} of {data!.totalFiltered}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={(data?.page ?? 1) <= 1}
                    className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {data?.page ?? 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={(data?.page ?? 1) >= totalPages}
                    className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`font-display mt-1 text-2xl ${tone}`}>{value}</div>
    </div>
  );
}
