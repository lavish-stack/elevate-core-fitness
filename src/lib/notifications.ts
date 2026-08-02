import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NotificationRow = {
  id: string;
  user_id: string | null;
  audience: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationScope = "user" | "admin";

const KEY = (scope: NotificationScope, userId: string | undefined) => [
  "notifications",
  scope,
  userId ?? "anon",
];

export function useNotifications(scope: NotificationScope = "user") {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const list = useQuery({
    queryKey: KEY(scope, userId),
    enabled: Boolean(userId),
    staleTime: 15_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      let q = supabase
        .from("notifications")
        .select("id,user_id,audience,kind,title,body,link,is_read,created_at")
        .eq("audience", scope)
        .order("created_at", { ascending: false })
        .limit(60);
      if (scope === "user" && userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRow[];
    },
  });

  // Live updates so alerts appear without a refresh.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${scope}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void qc.invalidateQueries({ queryKey: KEY(scope, userId) });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, scope, userId]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY(scope, userId) }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = (list.data ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY(scope, userId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY(scope, userId) }),
  });

  const items = list.data ?? [];
  return {
    items,
    unread: items.filter((n) => !n.is_read).length,
    isLoading: list.isLoading,
    isError: list.isError,
    markRead,
    markAllRead,
    remove,
  };
}

/** Creates expiry reminders for the signed-in member (idempotent, server-side). */
export function useExpiryReminderCheck() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    void supabase.rpc("check_my_membership_expiry");
  }, [user?.id]);
}
