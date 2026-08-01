import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/trials")({
  head: () => ({
    meta: [
      { title: "Trial Registrations — New Fitness Zone Admin" },
      { name: "description", content: "Track free-trial signups from the website and update their follow-up status." },
      { property: "og:title", content: "Trial Registrations — New Fitness Zone Admin" },
      { property: "og:description", content: "Free-trial leads captured from the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrialsAdmin,
});

const STATUSES = ["new", "contacted", "converted", "closed"] as const;

function TrialsAdmin() {
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin", "trial_registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: (typeof STATUSES)[number] }) => {
      const { error } = await supabase.from("trial_registrations").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trial_registrations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Registration deleted");
      setConfirmId(null);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  return (
    <AdminShell
      title="TRIAL REGISTRATIONS"
      subtitle="Free-trial leads captured from the website. Update the status as you follow up."
    >
      {list.isLoading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading registrations…
        </div>
      ) : (
        <div className="card-premium overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Phone</th>
                <th className="px-5 py-4 font-medium">Goal</th>
                <th className="px-5 py-4 font-medium">Registered</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{t.full_name}</div>
                    <div className="text-xs text-white/40">{t.email ?? "—"}</div>
                  </td>
                  <td className="px-5 py-4 text-white/70">{t.phone}</td>
                  <td className="px-5 py-4 text-white/70">{t.goal ?? "—"}</td>
                  <td className="px-5 py-4 text-white/50">
                    {new Date(t.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        setStatus.mutate({ id: t.id, status: e.target.value as (typeof STATUSES)[number] })
                      }
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-widest text-primary outline-none focus:border-primary/60"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-background text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setConfirmId(t.id)}
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
                  <td colSpan={6} className="px-5 py-10 text-center text-white/40">
                    No trial registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmId && (
        <Modal title="Delete registration?" onClose={() => setConfirmId(null)}>
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
