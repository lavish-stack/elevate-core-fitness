// Shared, client-safe types for the Admin → Members module.
// Kept in its own module so the route files can import types without pulling
// in any server-only code.

export type MemberStatus = "active" | "expiring_soon" | "expired" | "cancelled" | "no_membership";

export type MemberListRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  joinDate: string; // profiles.created_at
  planId: string | null;
  planName: string | null;
  status: MemberStatus;
  startsAt: string | null;
  expiresAt: string | null;
  /** Days until expiry, clamped at 0 for already-expired rows. */
  remainingDays: number | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  bookingCount: number;
  profileComplete: boolean;
};

export type MemberKpis = {
  totalMembers: number;
  activeMembers: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredMembers: number;
  membersWithoutActiveMembership: number;
  newMembersThisMonth: number;
  renewalsThisMonth: number;
  revenueThisMonthInr: number;
};

export type MemberAnalytics = {
  planDistribution: { planName: string; count: number }[];
  activeVsExpired: { active: number; expired: number; cancelled: number; noMembership: number };
  newMembersByMonth: { month: string; count: number }[];
  renewalsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; amountInr: number }[];
};

export type MemberSort =
  | "joined_desc"
  | "joined_asc"
  | "name_asc"
  | "expiry_asc"
  | "expiry_desc";

export type ListMembersInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MemberStatus | "";
  planId?: string;
  sort?: MemberSort;
};

export type ListMembersResult = {
  /** Only the requested page of members — never the full roster. */
  members: MemberListRow[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  plans: { id: string; name: string }[];
  kpis: MemberKpis;
  analytics: MemberAnalytics;
};

export type MemberCsvRow = {
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  startDate: string;
  expiryDate: string;
  remainingDays: string;
  lastPaymentDate: string;
  lastPaymentAmount: string;
};

export type MemberDetail = {
  profile: {
    userId: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    joinDate: string;
  };
  currentMembership: {
    id: string;
    planId: string | null;
    planName: string;
    amountInr: number;
    status: string;
    startsAt: string;
    expiresAt: string;
    remainingDays: number;
    cardCode: string;
  } | null;
  membershipHistory: {
    id: string;
    planName: string;
    amountInr: number;
    status: string;
    startsAt: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  }[];
  paymentHistory: {
    id: string;
    amountInr: number;
    currency: string;
    status: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    planName: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  bookingHistory: {
    id: string;
    trainerName: string;
    sessionDate: string;
    timeSlot: string;
    status: string;
    createdAt: string;
  }[];
  membershipRequests: {
    id: string;
    type: string;
    status: string;
    planName: string | null;
    note: string | null;
    adminNote: string | null;
    createdAt: string;
  }[];
};
