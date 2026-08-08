// Server-only module. Never imported directly by a route/component file —
// always reached via a `.server.ts`/`.functions.ts` handler (dynamic import),
// matching the convention already used in `client.server.ts`.
//
// This is the SINGLE source of truth for "what does activating a membership
// mean" (which fields get written, insert-vs-update decision). Both the
// admin approval flow (admin/requests.tsx, via activateMembershipServerFn)
// and the verified Razorpay payment flow (payment-finalization.server.ts)
// call this function — so the business rule is defined once, not duplicated.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ActivateMembershipInput = {
  userId: string;
  planId: string;
  startsAt: string; // ISO date (yyyy-mm-dd)
  expiresAt: string; // ISO date (yyyy-mm-dd)
  /**
   * Pass an explicit membership id when the caller already knows which row
   * to update (e.g. the admin approving a renewal request that references a
   * specific membership). When omitted, the function looks for the member's
   * current `active` membership and treats this as a renewal of that row;
   * if none exists, it creates a new membership row. This mirrors exactly
   * the branching that already existed inline in admin/requests.tsx.
   */
  existingMembershipId?: string | null;
};

export type ActivateMembershipResult = {
  membershipId: string;
  mode: "created" | "renewed";
};

/**
 * Creates or renews a membership. Always re-reads the plan's name/price from
 * the database — callers must never pass plan name/price through directly,
 * since those values could be stale or (in the payment path) client-influenced.
 *
 * `db` must be a client that is allowed to write to `memberships` — in
 * practice this is always `supabaseAdmin` (service role), since neither
 * regular members nor the payment/webhook code paths have their own
 * `memberships` INSERT/UPDATE grant under RLS.
 */
export async function activateMembershipForPlan(
  db: SupabaseClient<Database>,
  input: ActivateMembershipInput,
): Promise<ActivateMembershipResult> {
  const { data: plan, error: planError } = await db
    .from("membership_plans")
    .select("id,name,price_inr")
    .eq("id", input.planId)
    .maybeSingle();

  if (planError) throw new Error("Could not load the membership plan.");
  if (!plan) throw new Error("Membership plan not found.");

  let membershipId = input.existingMembershipId ?? null;

  if (!membershipId) {
    const { data: activeRow, error: activeError } = await db
      .from("memberships")
      .select("id")
      .eq("user_id", input.userId)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw new Error("Could not check existing membership.");
    membershipId = activeRow?.id ?? null;
  }

  if (membershipId) {
    const { data: updated, error } = await db
      .from("memberships")
      .update({
        plan_id: plan.id,
        plan_name: plan.name,
        amount_inr: plan.price_inr,
        status: "active",
        starts_at: input.startsAt,
        expires_at: input.expiresAt,
      })
      .eq("id", membershipId)
      .select("id")
      .single();
    if (error || !updated) throw new Error("Could not update the membership.");
    return { membershipId: updated.id, mode: "renewed" };
  }

  // card_code is intentionally omitted on insert: the memberships table
  // applies a cryptographically strong default (gen_random_uuid()-derived).
  // Never generate it here or client-side.
  const { data: inserted, error } = await db
    .from("memberships")
    .insert({
      user_id: input.userId,
      plan_id: plan.id,
      plan_name: plan.name,
      amount_inr: plan.price_inr,
      status: "active",
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error("Could not create the membership.");
  return { membershipId: inserted.id, mode: "created" };
}

export function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
