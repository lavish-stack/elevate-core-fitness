// Server-only helpers for the Admin → Members module.
// Never imported by a route/component file — always reached from
// `members-admin.functions.ts` handlers, matching the convention used by
// `membership-activation.server.ts`.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  ListMembersInput,
  ListMembersResult,
  MemberCsvRow,
  MemberDetail,
  MemberListRow,
  MemberStatus,
} from "@/lib/members-admin.types";

type Db = SupabaseClient<Database>;

/**
 * Explicit, server-side admin check. RLS already limits the table reads below
 * to "own row OR admin", but the email lookup goes through the Auth Admin API
 * (service role, RLS bypassed) — this check is what stands between "any
 * authenticated member" and "every member's email address". Same pattern as
 * admin-membership.functions.ts.
 */
export async function assertAdmin(userSupabase: Db, userId: string) {
  const { data: roleRow, error } = await userSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Could not verify admin permissions.");
  if (!roleRow) throw new Error("Forbidden: admin role required.");
}

const DAY_MS = 86_400_000;

function classifyMembership(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
  today: string,
): { status: MemberStatus; remainingDays: number | null } {
  if (!status || !expiresAt) return { status: "no_membership", remainingDays: null };
  if (status === "cancelled") return { status: "cancelled", remainingDays: null };
  if (status === "pending") return { status: "no_membership", remainingDays: null };

  const remainingDays = Math.ceil(
    (new Date(`${expiresAt}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY_MS,
  );

  if (status === "expired" || remainingDays < 0) {
    return { status: "expired", remainingDays: Math.max(remainingDays, 0) };
  }
  // Mirrors the 7-day window used by check_my_membership_expiry(), so the
  // admin "Expiring Soon" bucket lines up with member-facing reminders.
  if (remainingDays <= 7) return { status: "expiring_soon", remainingDays };
  return { status: "active", remainingDays };
}

const monthKey = (iso: string) => iso.slice(0, 7);

function lastNMonthKeys(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 0; i < n; i++) {
    out.unshift(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

/** Emails live only in Supabase Auth (profiles intentionally omits them), so
 * this is the only source. Bounded page loop so a runaway cannot occur. */
async function fetchAllEmails(supabaseAdmin: Db): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Could not load member accounts.");
    for (const u of data.users) map.set(u.id, u.email ?? null);
    if (data.users.length < perPage) break;
  }
  return map;
}

type MembershipLite = {
  user_id: string;
  plan_id: string | null;
  plan_name: string;
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * Base roster: one row per profile with its "current" membership resolved —
 * prefer the active row, otherwise the latest-expiring row of any status
 * (the same selection rule the member dashboard uses). Only narrow columns
 * are read, and none of this intermediate data leaves the server; the caller
 * filters/sorts/paginates before returning anything to the browser.
 */
async function buildRoster(db: Db, supabaseAdmin: Db, today: string) {
  const [profilesRes, membershipsRes] = await Promise.all([
    db.from("profiles").select("id,full_name,phone,created_at"),
    db
      .from("memberships")
      .select("user_id,plan_id,plan_name,status,starts_at,expires_at,created_at,updated_at")
      .order("expires_at", { ascending: false }),
  ]);
  if (profilesRes.error) throw new Error("Could not load member profiles.");
  if (membershipsRes.error) throw new Error("Could not load memberships.");

  const emailByUser = await fetchAllEmails(supabaseAdmin);

  const memberships = (membershipsRes.data ?? []) as MembershipLite[];
  const currentByUser = new Map<string, MembershipLite>();
  for (const m of memberships) {
    const existing = currentByUser.get(m.user_id);
    if (!existing) {
      currentByUser.set(m.user_id, m);
      continue;
    }
    if (existing.status !== "active" && m.status === "active") currentByUser.set(m.user_id, m);
  }

  const profiles = profilesRes.data ?? [];
  const roster = profiles.map((p) => {
    const current = currentByUser.get(p.id);
    const { status, remainingDays } = classifyMembership(current?.status, current?.expires_at, today);
    return {
      userId: p.id,
      fullName: p.full_name,
      email: emailByUser.get(p.id) ?? null,
      phone: p.phone,
      joinDate: p.created_at,
      planId: current?.plan_id ?? null,
      planName: current?.plan_name ?? null,
      status,
      startsAt: current?.starts_at ?? null,
      expiresAt: current?.expires_at ?? null,
      remainingDays,
      profileComplete: Boolean(p.full_name && p.phone),
    };
  });

  return { roster, profiles, memberships };
}

type RosterRow = Awaited<ReturnType<typeof buildRoster>>["roster"][number];

function applyFilters(roster: RosterRow[], input: ListMembersInput) {
  const needle = (input.search ?? "").trim().toLowerCase();
  return roster.filter((m) => {
    if (input.status && m.status !== input.status) return false;
    if (input.planId && m.planId !== input.planId) return false;
    if (!needle) return true;
    return [m.fullName, m.email, m.phone].some((v) => (v ?? "").toLowerCase().includes(needle));
  });
}

function applySort(rows: RosterRow[], sort: ListMembersInput["sort"]) {
  const byExpiry = (a: RosterRow, b: RosterRow, dir: number) =>
    dir * ((a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""));
  const sorted = [...rows];
  switch (sort) {
    case "joined_asc":
      sorted.sort((a, b) => a.joinDate.localeCompare(b.joinDate));
      break;
    case "name_asc":
      sorted.sort((a, b) => (a.fullName ?? "~").localeCompare(b.fullName ?? "~"));
      break;
    case "expiry_asc":
      sorted.sort((a, b) => byExpiry(a, b, 1));
      break;
    case "expiry_desc":
      sorted.sort((a, b) => byExpiry(a, b, -1));
      break;
    default:
      sorted.sort((a, b) => b.joinDate.localeCompare(a.joinDate));
  }
  return sorted;
}

/** Enriches ONLY the visible page with last-payment and booking counts, so a
 * growing payment/booking history never affects list performance. */
async function enrichPage(db: Db, pageRows: RosterRow[]): Promise<MemberListRow[]> {
  const ids = pageRows.map((r) => r.userId);
  if (ids.length === 0) return [];

  const [paymentsRes, bookingsRes] = await Promise.all([
    db
      .from("payments")
      .select("user_id,amount_inr,updated_at")
      .eq("status", "paid")
      .in("user_id", ids)
      .order("updated_at", { ascending: false }),
    db.from("trainer_bookings").select("user_id").in("user_id", ids),
  ]);
  if (paymentsRes.error) throw new Error("Could not load payments.");
  if (bookingsRes.error) throw new Error("Could not load bookings.");

  const lastPayment = new Map<string, { amount: number; date: string }>();
  for (const p of paymentsRes.data ?? []) {
    if (!lastPayment.has(p.user_id)) {
      lastPayment.set(p.user_id, { amount: Number(p.amount_inr), date: p.updated_at });
    }
  }
  const bookingCount = new Map<string, number>();
  for (const b of bookingsRes.data ?? []) {
    bookingCount.set(b.user_id, (bookingCount.get(b.user_id) ?? 0) + 1);
  }

  return pageRows.map((r) => ({
    ...r,
    lastPaymentDate: lastPayment.get(r.userId)?.date ?? null,
    lastPaymentAmount: lastPayment.get(r.userId)?.amount ?? null,
    bookingCount: bookingCount.get(r.userId) ?? 0,
  }));
}

export async function listMembersImpl(
  db: Db,
  supabaseAdmin: Db,
  input: ListMembersInput,
): Promise<ListMembersResult> {
  const today = new Date().toISOString().slice(0, 10);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 5), 100);

  const { roster, profiles, memberships } = await buildRoster(db, supabaseAdmin, today);

  const months6 = lastNMonthKeys(6);
  const since = `${months6[0]}-01T00:00:00.000Z`;
  const [paidPaymentsRes, plansRes] = await Promise.all([
    db
      .from("payments")
      .select("amount_inr,updated_at")
      .eq("status", "paid")
      .gte("updated_at", since),
    db.from("membership_plans").select("id,name").order("sort_order"),
  ]);
  if (paidPaymentsRes.error) throw new Error("Could not load payments.");
  if (plansRes.error) throw new Error("Could not load membership plans.");
  const paidPayments = paidPaymentsRes.data ?? [];

  const filtered = applySort(applyFilters(roster, input), input.sort);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(input.page ?? 1, 1), totalPages);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const members = await enrichPage(db, pageRows);

  // ---------------- KPIs ----------------
  const thisMonth = monthKey(today);
  const activeMembers = roster.filter((m) => m.status === "active" || m.status === "expiring_soon").length;
  const expiredMembers = roster.filter((m) => m.status === "expired").length;
  const inWindow = (m: RosterRow, days: number) =>
    m.status !== "expired" && m.remainingDays !== null && m.remainingDays >= 0 && m.remainingDays <= days;
  const isRenewal = (m: { created_at: string; updated_at: string }) =>
    new Date(m.updated_at).getTime() - new Date(m.created_at).getTime() > 60_000;

  const kpis = {
    totalMembers: roster.length,
    activeMembers,
    expiringIn7Days: roster.filter((m) => inWindow(m, 7)).length,
    expiringIn30Days: roster.filter((m) => inWindow(m, 30)).length,
    expiredMembers,
    membersWithoutActiveMembership: roster.length - activeMembers,
    newMembersThisMonth: profiles.filter((p) => monthKey(p.created_at) === thisMonth).length,
    // Both the admin approval path and the Razorpay path UPDATE an existing
    // membership row when renewing, so "updated well after created" is the
    // renewal signal.
    renewalsThisMonth: memberships.filter((m) => monthKey(m.updated_at) === thisMonth && isRenewal(m)).length,
    revenueThisMonthInr: paidPayments
      .filter((p) => monthKey(p.updated_at) === thisMonth)
      .reduce((sum, p) => sum + Number(p.amount_inr), 0),
  };

  // ---------------- Analytics ----------------
  const planDistributionMap = new Map<string, number>();
  for (const m of roster) {
    if (!m.planName || m.status === "no_membership" || m.status === "cancelled") continue;
    planDistributionMap.set(m.planName, (planDistributionMap.get(m.planName) ?? 0) + 1);
  }

  return {
    members,
    page,
    pageSize,
    totalFiltered: filtered.length,
    plans: (plansRes.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    kpis,
    analytics: {
      planDistribution: Array.from(planDistributionMap.entries())
        .map(([planName, count]) => ({ planName, count }))
        .sort((a, b) => b.count - a.count),
      activeVsExpired: {
        active: activeMembers,
        expired: expiredMembers,
        cancelled: roster.filter((m) => m.status === "cancelled").length,
        noMembership: roster.filter((m) => m.status === "no_membership").length,
      },
      newMembersByMonth: months6.map((month) => ({
        month,
        count: profiles.filter((p) => monthKey(p.created_at) === month).length,
      })),
      renewalsByMonth: months6.map((month) => ({
        month,
        count: memberships.filter((m) => monthKey(m.updated_at) === month && isRenewal(m)).length,
      })),
      revenueByMonth: months6.map((month) => ({
        month,
        amountInr: paidPayments
          .filter((p) => monthKey(p.updated_at) === month)
          .reduce((sum, p) => sum + Number(p.amount_inr), 0),
      })),
    },
  };
}

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  cancelled: "Cancelled",
  no_membership: "No Active Membership",
};

/** CSV export payload. Contains no credentials, tokens or payment secrets. */
export async function exportMembersImpl(
  db: Db,
  supabaseAdmin: Db,
  input: ListMembersInput,
): Promise<MemberCsvRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { roster } = await buildRoster(db, supabaseAdmin, today);
  const filtered = applySort(applyFilters(roster, input), input.sort);

  const ids = filtered.map((r) => r.userId);
  const lastPayment = new Map<string, { amount: number; date: string }>();
  if (ids.length > 0) {
    const { data, error } = await db
      .from("payments")
      .select("user_id,amount_inr,updated_at")
      .eq("status", "paid")
      .in("user_id", ids)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Could not load payments.");
    for (const p of data ?? []) {
      if (!lastPayment.has(p.user_id)) {
        lastPayment.set(p.user_id, { amount: Number(p.amount_inr), date: p.updated_at });
      }
    }
  }

  return filtered.map((m) => {
    const pay = lastPayment.get(m.userId);
    return {
      name: m.fullName ?? "",
      email: m.email ?? "",
      phone: m.phone ?? "",
      plan: m.planName ?? "",
      status: STATUS_LABEL[m.status],
      startDate: m.startsAt ?? "",
      expiryDate: m.expiresAt ?? "",
      remainingDays: m.remainingDays === null ? "" : String(m.remainingDays),
      lastPaymentDate: pay ? pay.date.slice(0, 10) : "",
      lastPaymentAmount: pay ? String(pay.amount) : "",
    };
  });
}

export async function getMemberDetailImpl(
  db: Db,
  supabaseAdmin: Db,
  userId: string,
): Promise<MemberDetail> {
  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, membershipsRes, paymentsRes, bookingsRes, requestsRes, plansRes, trainersRes] =
    await Promise.all([
      db.from("profiles").select("id,full_name,phone,created_at").eq("id", userId).maybeSingle(),
      db
        .from("memberships")
        .select("id,plan_id,plan_name,amount_inr,status,starts_at,expires_at,card_code,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("payments")
        .select("id,plan_id,amount_inr,currency,status,provider,provider_order_id,provider_payment_id,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("trainer_bookings")
        .select("id,trainer_id,session_date,time_slot,status,created_at")
        .eq("user_id", userId)
        .order("session_date", { ascending: false }),
      db
        .from("membership_requests")
        .select("id,type,status,plan_id,note,admin_note,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db.from("membership_plans").select("id,name"),
      db.from("trainers").select("id,name"),
    ]);

  if (profileRes.error) throw new Error("Could not load member profile.");
  if (!profileRes.data) throw new Error("Member not found.");
  if (membershipsRes.error) throw new Error("Could not load membership history.");
  if (paymentsRes.error) throw new Error("Could not load payment history.");
  if (bookingsRes.error) throw new Error("Could not load booking history.");
  if (requestsRes.error) throw new Error("Could not load membership requests.");
  if (plansRes.error) throw new Error("Could not load membership plans.");
  if (trainersRes.error) throw new Error("Could not load trainers.");

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authError) throw new Error("Could not load member account.");

  const planNameById = new Map((plansRes.data ?? []).map((p) => [p.id, p.name]));
  const trainerNameById = new Map((trainersRes.data ?? []).map((t) => [t.id, t.name]));

  const memberships = membershipsRes.data ?? [];
  const current = memberships.find((m) => m.status === "active") ?? memberships[0] ?? null;

  return {
    profile: {
      userId: profileRes.data.id,
      fullName: profileRes.data.full_name,
      email: authUser.user?.email ?? null,
      phone: profileRes.data.phone,
      joinDate: profileRes.data.created_at,
    },
    currentMembership: current
      ? {
          id: current.id,
          planId: current.plan_id,
          planName: current.plan_name,
          amountInr: Number(current.amount_inr),
          status: current.status,
          startsAt: current.starts_at,
          expiresAt: current.expires_at,
          remainingDays: Math.max(
            0,
            Math.ceil(
              (new Date(`${current.expires_at}T00:00:00Z`).getTime() -
                new Date(`${today}T00:00:00Z`).getTime()) /
                DAY_MS,
            ),
          ),
          cardCode: current.card_code,
        }
      : null,
    membershipHistory: memberships.map((m) => ({
      id: m.id,
      planName: m.plan_name,
      amountInr: Number(m.amount_inr),
      status: m.status,
      startsAt: m.starts_at,
      expiresAt: m.expires_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })),
    paymentHistory: (paymentsRes.data ?? []).map((p) => ({
      id: p.id,
      amountInr: Number(p.amount_inr),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerOrderId: p.provider_order_id,
      providerPaymentId: p.provider_payment_id,
      planName: p.plan_id ? planNameById.get(p.plan_id) ?? null : null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    bookingHistory: (bookingsRes.data ?? []).map((b) => ({
      id: b.id,
      trainerName: trainerNameById.get(b.trainer_id) ?? "Trainer",
      sessionDate: b.session_date,
      timeSlot: b.time_slot,
      status: b.status,
      createdAt: b.created_at,
    })),
    membershipRequests: (requestsRes.data ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      planName: r.plan_id ? planNameById.get(r.plan_id) ?? null : null,
      note: r.note,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })),
  };
}
