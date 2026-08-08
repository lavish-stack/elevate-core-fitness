// Server-only module. This is the ONE place that transitions a `payments`
// row to `paid` and activates the corresponding membership. It is called
// from two entry points that verify signatures differently:
//   1. verifyRazorpayPayment (payments.functions.ts) — right after Checkout.js
//      returns a signed response to the browser.
//   2. the Razorpay webhook (routes/api/payments/webhook.ts) — asynchronously,
//      as the authoritative, replay-safe confirmation.
// Both entry points MUST verify a signature themselves before calling this.
// This function does not re-verify anything — its only job is to make the
// "mark paid + activate" transition atomic and idempotent, so that no
// matter which entry point wins the race (or if both fire), the membership
// is activated exactly once.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { activateMembershipForPlan, addDaysIso, todayIso } from "./membership-activation.server";

export type FinalizeResult =
  | { outcome: "activated"; membershipId: string }
  | { outcome: "already_processed"; membershipId: string | null }
  | { outcome: "payment_not_found" };

/**
 * Atomically transitions payments.status: 'created' -> 'paid', then
 * activates the membership. The `.eq("status", "created")` in the update
 * is the concurrency guard: if two callers race (e.g. the client-side verify
 * call and the webhook both fire for the same payment), only the first
 * conditional UPDATE actually matches a row and proceeds to activation; the
 * second sees zero rows affected and safely no-ops, returning the
 * already-linked membership id instead of activating twice.
 */
export async function finalizeSuccessfulPayment(
  supabaseAdmin: SupabaseClient<Database>,
  params: { paymentId: string; providerPaymentId: string },
): Promise<FinalizeResult> {
  const { data: existingPayment, error: fetchError } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,plan_id,status,membership_id")
    .eq("id", params.paymentId)
    .maybeSingle();

  if (fetchError) throw new Error("Could not load payment record.");
  if (!existingPayment) return { outcome: "payment_not_found" };

  if (existingPayment.status === "paid") {
    return { outcome: "already_processed", membershipId: existingPayment.membership_id };
  }
  if (existingPayment.status !== "created") {
    // failed / cancelled / refunded payments are never resurrected into paid.
    return { outcome: "already_processed", membershipId: existingPayment.membership_id };
  }
  if (!existingPayment.plan_id) {
    throw new Error("Payment has no associated plan.");
  }

  // Conditional update = compare-and-swap. Only proceeds if status is still
  // 'created' at the moment of the write, closing the race window between
  // the read above and this write.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("payments")
    .update({ status: "paid", provider_payment_id: params.providerPaymentId })
    .eq("id", params.paymentId)
    .eq("status", "created")
    .select("id,user_id,plan_id")
    .maybeSingle();

  if (claimError) throw new Error("Could not update payment status.");
  if (!claimed) {
    // Lost the race to another concurrent finalize call — re-read the
    // now-settled row so the caller still gets a membership id.
    const { data: settled } = await supabaseAdmin
      .from("payments")
      .select("membership_id")
      .eq("id", params.paymentId)
      .maybeSingle();
    return { outcome: "already_processed", membershipId: settled?.membership_id ?? null };
  }

  const startsAt = todayIso();
  const { data: plan, error: planError } = await supabaseAdmin
    .from("membership_plans")
    .select("duration_days")
    .eq("id", claimed.plan_id!)
    .maybeSingle();
  if (planError || !plan) throw new Error("Membership plan not found for this payment.");
  const expiresAt = addDaysIso(startsAt, plan.duration_days);

  const activation = await activateMembershipForPlan(supabaseAdmin, {
    userId: claimed.user_id,
    planId: claimed.plan_id!,
    startsAt,
    expiresAt,
  });

  await supabaseAdmin.from("payments").update({ membership_id: activation.membershipId }).eq("id", claimed.id);

  return { outcome: "activated", membershipId: activation.membershipId };
}

/** Marks a payment as failed. Idempotent: no-ops if already settled. */
export async function markPaymentFailed(
  supabaseAdmin: SupabaseClient<Database>,
  params: { paymentId?: string; providerOrderId?: string; reason: string },
): Promise<void> {
  const query = supabaseAdmin.from("payments").update({ status: "failed", failure_reason: params.reason.slice(0, 300) }).eq("status", "created");
  const { error } = params.paymentId
    ? await query.eq("id", params.paymentId)
    : await query.eq("provider_order_id", params.providerOrderId!);
  if (error) throw new Error("Could not mark payment as failed.");
}

/** Looks up a payment row by the Razorpay order id (used by the webhook). */
export async function findPaymentByOrderId(supabaseAdmin: SupabaseClient<Database>, providerOrderId: string) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id,status,membership_id")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (error) throw new Error("Could not look up payment by order id.");
  return data;
}
