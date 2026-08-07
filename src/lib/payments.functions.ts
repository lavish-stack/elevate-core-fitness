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
