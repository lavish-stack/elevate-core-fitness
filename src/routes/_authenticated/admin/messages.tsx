import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MailOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({
    meta: [
      { title: "Contact Messages — New Fitness Zone Admin" },
      { name: "description", content: "Read and manage enquiries submitted through the New Fitness Zone contact form." },
      { property: "og:title", content: "Contact Messages — New Fitness Zone Admin" },
      { property: "og:description", content: "Inbox for website contact enquiries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesAdmin,
});

function MessagesAdmin() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin", "contact_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const { error } = await supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Message deleted");
      setConfirmId(null);
      setOpenId(null);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  const active = (list.data ?? []).find((m) => m.id === openId);
  const unread = (list.data ?? []).filter((m) => !m.is_read).length;

  return (
    <AdminShell
      title="CONTACT MESSAGES"
      subtitle={`Enquiries submitted from the website contact form. ${unread} unread.`}
    >
      {list.isLoading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
        </div>
      ) : (
        <div className="card-premium overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
                <th className="px-5 py-4 font-medium">From</th>
                <th className="px-5 py-4 font-medium">Subject</th>
                <th className="px-5 py-4 font-medium">Received</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((m) => (
                <tr key={m.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <button onClick={() => setOpenId(m.id)} className="text-left">
                      <span className={m.is_read ? "text-white/70" : "font-semibold text-white"}>
                        {m.full_name}
                      </span>
                      <span className="block text-xs text-white/40">{m.email}</span>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-white/70">{m.subject ?? "—"}</td>
                  <td className="px-5 py-4 text-white/50">
                    {new Date(m.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleRead.mutate({ id: m.id, isRead: !m.is_read })}
                        className="rounded-lg border border-white/10 p-2 text-white/70 hover:border-primary/50 hover:text-primary"
                        aria-label={m.is_read ? "Mark unread" : "Mark read"}
                      >
                        {m.is_read ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmId(m.id)}
                        className="rounded-lg border border-white/10 p-2 text-white/70 hover:border-primary/50 hover:text-primary"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(list.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-white/40">
                    No messages yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <Modal title={active.subject ?? "Message"} onClose={() => setOpenId(null)}>
          <div className="space-y-2 text-sm text-white/60">
            <div>
              <span className="text-white/40">From:</span> {active.full_name} · {active.email}
            </div>
            {active.phone && (
              <div>
                <span className="text-white/40">Phone:</span> {active.phone}
              </div>
            )}
            <div>
              <span className="text-white/40">Received:</span>{" "}
              {new Date(active.created_at).toLocaleString("en-IN")}
            </div>
          </div>
          <p className="glass mt-5 whitespace-pre-wrap rounded-2xl p-4 text-sm text-white/80">
            {active.message}
          </p>
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => toggleRead.mutate({ id: active.id, isRead: !active.is_read })}
              className="btn-ghost !py-2.5 !px-5 text-sm"
            >
              Mark as {active.is_read ? "unread" : "read"}
            </button>
            <a href={`mailto:${active.email}`} className="btn-primary !py-2.5 !px-5 text-sm">
              Reply by email
            </a>
          </div>
        </Modal>
      )}

      {confirmId && (
        <Modal title="Delete message?" onClose={() => setConfirmId(null)}>
          <p className="text-sm text-white/60">This cannot be undone.</p>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setConfirmId(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => remove.mutate(confirmId)}
              disabled={remove.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
