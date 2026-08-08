import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { z } from "zod";
import { MemberHeader } from "@/components/member/MemberHeader";
import { ErrorState, SkeletonBlock } from "@/components/gym/States";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/site-data";
import {
  closeCheckoutAttempt,
  createCheckoutIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/lib/payments.functions";

// Loaded on demand, only when a configured Razorpay order is actually ready
// to open — keeps the script out of the bundle/page for members who never
// reach a live checkout.
function loadRazorpayCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("razorpay-checkout-js")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment gateway. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: { description?: string; reason?: string };
};

type RazorpayInstance = { open: () => void; on: (event: string, cb: (resp: RazorpayFailureResponse) => void) => void };

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: z.object({ plan: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Membership Checkout — New Fitness Zone" },
      { name: "description", content: "Review your selected New Fitness Zone membership plan, amount in rupees and continue to secure payment." },
      { property: "og:title", content: "Membership Checkout — New Fitness Zone" },
      { property: "og:description", content: "Secure membership checkout for New Fitness Zone members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type UiState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "unavailable"; message: string }
  | { kind: "failed"; message: string }
  | { kind: "cancelled" };

function Checkout() {
  const { plan: planId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<UiState>({ kind: "idle" });

  const startCheckout = useServerFn(createCheckoutIntent);
  const startOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const closeAttempt = useServerFn(closeCheckoutAttempt);
  // Guards against the rare case where Razorpay's handler fires more than
  // once for the same checkout session (their SDK generally doesn't, but
  // this makes the browser side idempotent too, on top of the server-side
  // idempotency in finalizeSuccessfulPayment).
  const verifiedOnceRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const intent = useQuery({
    queryKey: ["checkout-intent", planId],
    enabled: Boolean(planId),
    retry: false,
    queryFn: () => startCheckout({ data: { planId: planId! } }),
  });

  const verify = useMutation({
    mutationFn: async (input: { paymentId: string; response: RazorpaySuccessResponse }) =>
      verifyPayment({
        data: {
          paymentId: input.paymentId,
          razorpayOrderId: input.response.razorpay_order_id,
          razorpayPaymentId: input.response.razorpay_payment_id,
          razorpaySignature: input.response.razorpay_signature,
        },
      }),
    onMutate: () => setState({ kind: "verifying" }),
    onSuccess: (result) => {
      if (!result.verified) {
        setState({ kind: "failed", message: result.reason });
        return;
      }
      setState({ kind: "success" });
    },
    onError: (error) =>
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : "Could not verify payment. Contact us with your payment ID.",
      }),
  });

  const pay = useMutation({
    mutationFn: async (paymentId: string) => {
      const result = await startOrder({ data: { paymentId } });
      return { paymentId, result };
    },
    onMutate: () => setState({ kind: "processing" }),
    onSuccess: async ({ paymentId, result }) => {
      if (!result.configured) {
        setState({ kind: "unavailable", message: result.message });
        return;
      }

      try {
        await loadRazorpayCheckoutScript();
      } catch (e) {
        setState({ kind: "failed", message: e instanceof Error ? e.message : "Could not load payment gateway." });
        return;
      }

      verifiedOnceRef.current = false;

      const rzp = new window.Razorpay({
        key: result.keyId,
        amount: result.amountPaise,
        currency: result.currency,
        order_id: result.orderId,
        name: "New Fitness Zone",
        description: intent.data?.planName,
        prefill: {
          name: profile?.full_name || undefined,
          email: user?.email || undefined,
          contact: profile?.phone || undefined,
        },
        // Approximates this app's --primary token (oklch(0.62 0.24 25)) —
        // Razorpay's widget only accepts a literal hex color.
        theme: { color: "#e5342e" },
        // Membership activation NEVER happens here in the handler — this
        // callback only forwards the signed response to the server, which
        // re-verifies the HMAC signature before doing anything.
        handler: (response: RazorpaySuccessResponse) => {
          if (verifiedOnceRef.current) return;
          verifiedOnceRef.current = true;
          verify.mutate({ paymentId, response });
        },
        modal: {
          ondismiss: () => {
            // Guard against a stale-closure race: if `handler` already fired
            // (verifiedOnceRef.current === true), Razorpay is just closing
            // its own modal after a successful charge — do not overwrite
            // the in-flight/succeeded verification with "cancelled".
            if (verifiedOnceRef.current) return;
            void closeAttempt({ data: { paymentId, status: "cancelled" } });
            setState({ kind: "cancelled" });
          },
        },
      });

      rzp.on("payment.failed", (resp: RazorpayFailureResponse) => {
        const reason = resp.error?.description || resp.error?.reason || "Payment failed at the gateway.";
        void closeAttempt({ data: { paymentId, status: "failed", reason } });
        setState({ kind: "failed", message: reason });
      });

      rzp.open();
    },
    onError: (error) =>
      setState({ kind: "failed", message: error instanceof Error ? error.message : "Payment could not be started." }),
  });

  const cancel = useMutation({
    mutationFn: async (paymentId: string) => closeAttempt({ data: { paymentId, status: "cancelled" } }),
    onSuccess: () => setState({ kind: "cancelled" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 transition-colors hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <h1 className="mt-5 font-display text-4xl md:text-5xl leading-[0.95]">
          MEMBERSHIP <span className="text-gradient-red">CHECKOUT</span>
        </h1>

        {!planId && (
          <div className="card-premium mt-8 p-7 text-white/70">
            No plan selected. <Link to="/" className="text-primary">Choose a membership plan</Link> to continue.
          </div>
        )}

        {planId && intent.isLoading && <div className="mt-8"><SkeletonBlock className="h-64" /></div>}

        {planId && intent.isError && (
          <div className="mt-8">
            <ErrorState description={intent.error instanceof Error ? intent.error.message : "Could not start checkout."} onRetry={() => void intent.refetch()} />
          </div>
        )}

        {intent.data && (
          <div className="card-premium mt-8 p-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Selected plan</div>
            <h2 className="mt-2 font-display text-3xl">{intent.data.planName}</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Row label="Amount" value={`₹${formatINR(intent.data.amountInr)}`} />
              <Row label="Currency" value="INR (₹)" />
              <Row label="Duration" value={`${intent.data.durationDays} days ${intent.data.periodLabel}`} />
              <Row label="Member" value={profile?.full_name || user?.email || "—"} />
              <Row label="Email" value={user?.email ?? "—"} />
              <Row label="Phone" value={profile?.phone || "Not added"} />
            </div>

            {state.kind === "unavailable" && (
              <Banner tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>{state.message}</Banner>
            )}
            {state.kind === "failed" && (
              <Banner tone="error" icon={<XCircle className="h-4 w-4" />}>{state.message}</Banner>
            )}
            {state.kind === "cancelled" && (
              <Banner tone="warn" icon={<XCircle className="h-4 w-4" />}>
                Checkout cancelled. Nothing was charged.
              </Banner>
            )}
            {state.kind === "verifying" && (
              <Banner tone="warn" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
                Payment received — verifying and activating your membership…
              </Banner>
            )}
            {state.kind === "success" && (
              <Banner tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
                Payment verified. Your membership is now active.
              </Banner>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {state.kind !== "success" && (
                <button
                  type="button"
                  disabled={state.kind === "processing" || state.kind === "verifying" || state.kind === "cancelled"}
                  onClick={() => pay.mutate(intent.data.paymentId)}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {state.kind === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Starting payment…
                    </>
                  ) : state.kind === "verifying" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Continue to Payment
                    </>
                  )}
                </button>
              )}
              {state.kind !== "success" && (
                <button
                  type="button"
                  disabled={cancel.isPending || state.kind === "cancelled" || state.kind === "verifying"}
                  onClick={() => cancel.mutate(intent.data.paymentId)}
                  className="btn-ghost disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              {(state.kind === "cancelled" || state.kind === "success") && (
                <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="btn-ghost">
                  {state.kind === "success" ? "Go to dashboard" : "Return to dashboard"}
                </button>
              )}
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-white/45">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Amounts are always read from our secure database. Memberships are activated only after a
              verified payment or admin approval — never from the browser.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-white/85">{value}</div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "warn" | "error" | "success";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-primary/40 bg-primary/10 text-white/85"
          : tone === "success"
            ? "border-emerald-500/40 bg-emerald-500/10 text-white/85"
            : "border-white/15 bg-white/5 text-white/75"
      }`}
    >
      <span className={`mt-0.5 ${tone === "success" ? "text-emerald-400" : "text-primary"}`}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
