import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, CreditCard, Loader2, ShieldCheck, XCircle } from "lucide-react";
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
} from "@/lib/payments.functions";

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
  const closeAttempt = useServerFn(closeCheckoutAttempt);

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

  const pay = useMutation({
    mutationFn: async (paymentId: string) => startOrder({ data: { paymentId } }),
    onMutate: () => setState({ kind: "processing" }),
    onSuccess: (result) => {
      if (!result.configured) {
        setState({ kind: "unavailable", message: result.message });
        return;
      }
      // Razorpay Checkout hand-off lands here once credentials are configured.
      // Membership activation happens only after server-side webhook verification.
      setState({
        kind: "unavailable",
        message: "Payment gateway session created. Completing payments will be enabled with the next release.",
      });
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

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={state.kind === "processing" || state.kind === "cancelled"}
                onClick={() => pay.mutate(intent.data.paymentId)}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {state.kind === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting payment…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Continue to Payment
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={cancel.isPending || state.kind === "cancelled"}
                onClick={() => cancel.mutate(intent.data.paymentId)}
                className="btn-ghost disabled:opacity-50"
              >
                Cancel
              </button>
              {state.kind === "cancelled" && (
                <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="btn-ghost">
                  Return to dashboard
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
  tone: "warn" | "error";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-primary/40 bg-primary/10 text-white/85"
          : "border-white/15 bg-white/5 text-white/75"
      }`}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
