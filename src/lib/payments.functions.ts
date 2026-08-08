import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckoutIntent = {
  paymentId: string;
  planId: string;
  planName: string;
  amountInr: number;
  currency: "INR";
  durationDays: number;
  periodLabel: string;
  status: string;
};

/**
 * Creates (or reuses) an open payment attempt for the selected plan.
 * The amount ALWAYS comes from the database — never from the client.
 */
export const createCheckoutIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CheckoutIntent> => {
    const { userId } = context;

    const { data: plan, error: planError } = await context.supabase
      .from("membership_plans")
      .select("id,name,price_inr,duration_days,period_label,is_active")
      .eq("id", data.planId)
      .maybeSingle();

    if (planError) throw new Error("Could not load the selected plan.");
    if (!plan || !plan.is_active) throw new Error("This plan is not available.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reuse an existing open attempt for the same plan (dedupe).
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id,status")
      .eq("user_id", userId)
      .eq("plan_id", plan.id)
      .eq("status", "created")
      .maybeSingle();

    let paymentId = existing?.id;

    if (!paymentId) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("payments")
        .insert({
          user_id: userId,
          plan_id: plan.id,
          amount_inr: plan.price_inr,
          currency: "INR",
          provider: "razorpay",
          status: "created",
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw new Error("Could not start the checkout. Please try again.");
      paymentId = inserted.id;
    }

    return {
      paymentId,
      planId: plan.id,
      planName: plan.name,
      amountInr: Number(plan.price_inr),
      currency: "INR",
      durationDays: plan.duration_days,
      periodLabel: plan.period_label,
      status: "created",
    };
  });

export type RazorpayOrderResult =
  | { configured: false; message: string }
  | { configured: true; keyId: string; orderId: string; amountPaise: number; currency: "INR" };

/**
 * Server-side Razorpay order creation. Secrets are read inside the handler and
 * never returned to the browser. Until credentials exist, this reports that
 * online payment is being configured — it never fakes a successful payment.
 */
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RazorpayOrderResult> => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];

    if (!keyId || !keySecret) {
      return {
        configured: false,
        message: "Online payment is being configured. Please request this plan and our team will confirm it manually.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id,user_id,amount_inr,status")
      .eq("id", data.paymentId)
      .maybeSingle();

    if (error || !payment) throw new Error("Payment attempt not found.");
    if (payment.user_id !== context.userId) throw new Error("Forbidden");
    if (payment.status !== "created") throw new Error("This payment attempt is no longer open.");

    const amountPaise = Math.round(Number(payment.amount_inr) * 100);

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: payment.id,
        notes: { payment_id: payment.id, user_id: payment.user_id },
      }),
    });

    if (!response.ok) {
      console.error("[razorpay] order creation failed", response.status, await response.text());
      throw new Error("Could not reach the payment gateway. Please try again.");
    }

    const order = (await response.json()) as { id: string };

    await supabaseAdmin
      .from("payments")
      .update({ provider_order_id: order.id })
      .eq("id", payment.id);

    return { configured: true, keyId, orderId: order.id, amountPaise, currency: "INR" };
  });

export type VerifyPaymentResult =
  | { verified: true; membershipId: string | null; outcome: "activated" | "already_processed" }
  | { verified: false; reason: string };

/**
 * Called by the browser immediately after Razorpay's Checkout.js `handler`
 * callback fires with a signed success response. This is NOT itself the
 * activation trigger — it verifies the HMAC signature Razorpay returned
 * (proving the payment_id genuinely belongs to the order WE created for
 * THIS user) and only then calls the same idempotent finalize path the
 * webhook uses. If this call never happens (tab closed, network drop), the
 * webhook still activates the membership independently and asynchronously —
 * this function exists purely to give the member instant feedback.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<VerifyPaymentResult> => {
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) {
      return { verified: false, reason: "Payment verification is not configured." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id,user_id,provider_order_id,status")
      .eq("id", data.paymentId)
      .maybeSingle();

    if (error || !payment) return { verified: false, reason: "Payment attempt not found." };
    // Ownership check: a member can only verify/finalize their own payment.
    if (payment.user_id !== context.userId) return { verified: false, reason: "Forbidden." };
    if (payment.provider_order_id !== data.razorpayOrderId) {
      return { verified: false, reason: "Order mismatch." };
    }

    const { verifyCheckoutSignature } = await import("@/lib/razorpay-verify.server");
    const signatureOk = await verifyCheckoutSignature({
      orderId: data.razorpayOrderId,
      paymentId: data.razorpayPaymentId,
      signature: data.razorpaySignature,
      keySecret,
    });

    if (!signatureOk) {
      const { markPaymentFailed } = await import("@/lib/payment-finalization.server");
      await markPaymentFailed(supabaseAdmin, { paymentId: payment.id, reason: "Signature verification failed." });
      return { verified: false, reason: "Payment could not be verified." };
    }

    const { finalizeSuccessfulPayment } = await import("@/lib/payment-finalization.server");
    const result = await finalizeSuccessfulPayment(supabaseAdmin, {
      paymentId: payment.id,
      providerPaymentId: data.razorpayPaymentId,
    });

    if (result.outcome === "payment_not_found") {
      return { verified: false, reason: "Payment attempt not found." };
    }
    return { verified: true, membershipId: result.membershipId, outcome: result.outcome };
  });

/** Marks an open attempt as cancelled or failed. Never marks anything as paid. */
export const closeCheckoutAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        status: z.enum(["cancelled", "failed"]),
        reason: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({ status: data.status, failure_reason: data.reason ?? null })
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .eq("status", "created");
    if (error) throw new Error("Could not update the payment attempt.");
    return { ok: true };
  });
