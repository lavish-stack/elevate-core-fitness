import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Thin, admin-gated wrapper around the shared activation function in
 * membership-activation.server.ts. This exists so admin/requests.tsx (an
 * existing, working, client-side admin flow) can reuse the exact same
 * business rule the Razorpay payment path uses — instead of keeping its own
 * separate insert/update logic — without changing anything about its UI or
 * behaviour. The admin's UI, fields, and confirmation flow are unchanged;
 * only the internal call it makes to persist the change is different.
 */
export const adminActivateMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        planId: z.string().uuid(),
        startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        existingMembershipId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Explicit admin-role check: this handler uses the service-role client
    // internally (via activateMembershipForPlan), which bypasses RLS, so
    // the authorization check has to happen here in application code rather
    // than relying on a database policy.
    const { data: roleRow, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error("Could not verify admin permissions.");
    if (!roleRow) throw new Error("Forbidden: admin role required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { activateMembershipForPlan } = await import("@/lib/membership-activation.server");

    const result = await activateMembershipForPlan(supabaseAdmin, {
      userId: data.userId,
      planId: data.planId,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      existingMembershipId: data.existingMembershipId ?? null,
    });

    return result;
  });
