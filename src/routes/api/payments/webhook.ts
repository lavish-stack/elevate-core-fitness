// Server file route. Reachable at POST /api/payments/webhook — this is the
// URL to register in the Razorpay dashboard.
//
// Route-registration boilerplate adapted to the installed TanStack Start
// version (@tanstack/react-start ^1.168.x), which uses `createFileRoute`
// with a `server.handlers` block. Verification/finalization logic is
// unchanged from the implementation package.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Reject unsigned requests (probes, browsers, misconfigured callers)
        // before anything else, so they never surface as server errors.
        const signatureHeader = request.headers.get("x-razorpay-signature");
        if (!signatureHeader) {
          return new Response(JSON.stringify({ error: "Missing signature" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!webhookSecret) {
          // Not an app crash — Razorpay is simply not configured yet.
          // 503 tells Razorpay to retry once credentials exist.
          console.warn("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
          return new Response(JSON.stringify({ error: "Webhook not configured" }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }


        // Signature is computed over the RAW body text — must read as text
        // before any JSON.parse, and must not re-serialize it afterwards.
        const rawBody = await request.text();

        const { verifyWebhookSignature } = await import("@/lib/razorpay-verify.server");
        const isValid = await verifyWebhookSignature({ rawBody, signatureHeader, webhookSecret });
        if (!isValid) {
          console.warn("[razorpay-webhook] signature verification failed");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        let event: {
          event?: string;
          payload?: {
            payment?: {
              entity?: {
                id?: string;
                order_id?: string;
                error_description?: string;
              };
            };
          };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response(JSON.stringify({ error: "Malformed payload" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const eventType = event.event;
        const entity = event.payload?.payment?.entity;
        const orderId = entity?.order_id;
        const razorpayPaymentId = entity?.id;

        if (!orderId) {
          // Event type we don't act on (e.g. refund/order events) — acknowledge
          // so Razorpay doesn't retry, but do nothing.
          return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { findPaymentByOrderId, finalizeSuccessfulPayment, markPaymentFailed } = await import(
          "@/lib/payment-finalization.server"
        );

        const payment = await findPaymentByOrderId(supabaseAdmin, orderId);
        if (!payment) {
          // Order we have no record of (stray/replayed/unrelated) — acknowledge,
          // do not error, so Razorpay stops retrying.
          console.warn("[razorpay-webhook] no payment found for order", orderId);
          return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
        }

        try {
          if (eventType === "payment.captured") {
            if (!razorpayPaymentId) {
              return new Response(JSON.stringify({ error: "Missing payment id" }), { status: 400 });
            }
            const result = await finalizeSuccessfulPayment(supabaseAdmin, {
              paymentId: payment.id,
              providerPaymentId: razorpayPaymentId,
            });
            // `already_processed` covers webhook replay and a race with the
            // client-side verify call — both are safe no-ops.
            return new Response(JSON.stringify({ received: true, outcome: result.outcome }), { status: 200 });
          }

          if (eventType === "payment.failed") {
            await markPaymentFailed(supabaseAdmin, {
              paymentId: payment.id,
              reason: entity?.error_description ?? "Payment failed at gateway.",
            });
            return new Response(JSON.stringify({ received: true, outcome: "marked_failed" }), { status: 200 });
          }

          // Any other event type: acknowledged, no action taken.
          return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
        } catch (err) {
          // Never leak internal error detail to the caller (Razorpay); log
          // server-side and return 500 so Razorpay retries the delivery.
          console.error("[razorpay-webhook] processing error", err);
          return new Response(JSON.stringify({ error: "Processing error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
