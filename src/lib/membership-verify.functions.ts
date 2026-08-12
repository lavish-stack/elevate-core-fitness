import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// No auth middleware on this function — it must be callable by a logged-out
// visitor scanning a QR code (see /verify/membership/:cardCode). It does NOT
// grant anonymous access to the `memberships` table: RLS on that table is
// completely untouched, and this function reaches it only via
// `supabaseAdmin` (service role), exactly like the Razorpay webhook and
// payment-finalization code already do. The safety boundary here is that
// this handler only ever returns a small, hand-picked DTO — never a raw row.

export type MembershipVerification =
  | { found: false }
  | {
      found: true;
      status: "active" | "expired" | "cancelled";
      /** First name only, derived from profiles.full_name — never email, phone, or user_id. */
      memberFirstName: string | null;
      planName: string;
      expiresAt: string;
    };

export const verifyMembershipCard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        cardCode: z.string().trim().min(1).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<MembershipVerification> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("memberships")
      .select("user_id,plan_name,status,expires_at")
      .eq("card_code", data.cardCode)
      .maybeSingle();

    if (membershipError) {
      console.error("[verify-membership] lookup failed");
      return { found: false };
    }
    if (!membership) return { found: false };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", membership.user_id)
      .maybeSingle();
    if (profileError) console.error("[verify-membership] profile lookup failed");

    const today = new Date().toISOString().slice(0, 10);
    const status: "active" | "expired" | "cancelled" =
      membership.status === "cancelled"
        ? "cancelled"
        : membership.status === "expired" || membership.expires_at < today
          ? "expired"
          : "active";

    const memberFirstName = profile?.full_name?.trim().split(/\s+/)[0] || null;

    return {
      found: true,
      status,
      memberFirstName,
      planName: membership.plan_name,
      expiresAt: membership.expires_at,
    };
  });
