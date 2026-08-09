import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  ListMembersResult,
  MemberCsvRow,
  MemberDetail,
} from "@/lib/members-admin.types";

const listInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(5).max(100).optional(),
  search: z.string().max(120).optional(),
  status: z
    .enum(["active", "expiring_soon", "expired", "cancelled", "no_membership", ""])
    .optional(),
  planId: z.string().uuid().or(z.literal("")).optional(),
  sort: z.enum(["joined_desc", "joined_asc", "name_asc", "expiry_asc", "expiry_desc"]).optional(),
});

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInputSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<ListMembersResult> => {
    const { assertAdmin, listMembersImpl } = await import("@/lib/members-admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return listMembersImpl(context.supabase, supabaseAdmin, {
      ...data,
      status: data.status === "" ? undefined : data.status,
      planId: data.planId === "" ? undefined : data.planId,
    });
  });

export const exportMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInputSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<MemberCsvRow[]> => {
    const { assertAdmin, exportMembersImpl } = await import("@/lib/members-admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return exportMembersImpl(context.supabase, supabaseAdmin, {
      ...data,
      status: data.status === "" ? undefined : data.status,
      planId: data.planId === "" ? undefined : data.planId,
    });
  });

export const getMemberDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<MemberDetail> => {
    const { assertAdmin, getMemberDetailImpl } = await import("@/lib/members-admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return getMemberDetailImpl(context.supabase, supabaseAdmin, data.userId);
  });
