import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadSiteImage } from "@/lib/admin-upload";

export type CrudField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "image" | "tags";
  required?: boolean;
  placeholder?: string;
  help?: string;
  folder?: string;
  min?: number;
  max?: number;
};

export type CrudColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
};

type Row = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function ImageUploadField({
  value,
  onChange,
  folder,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSiteImage(file, folder);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-white/50">{label}</label>
      <div className="mt-2 flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] text-white/40">None</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="btn-ghost !py-2 !px-4 inline-flex cursor-pointer text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => void handle(e.target.files?.[0])}
            />
          </label>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60"
          />
        </div>
      </div>
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CrudField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const base =
    "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60";

  if (field.type === "image") {
    return (
      <ImageUploadField
        value={str(value)}
        onChange={onChange}
        folder={field.folder ?? "uploads"}
        label={field.label}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[oklch(0.62_0.24_25)]"
        />
        <span className="text-white/80">{field.label}</span>
      </label>
    );
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-white/50">{field.label}</label>
      {field.type === "textarea" || field.type === "tags" ? (
        <textarea
          rows={field.type === "tags" ? 3 : 4}
          value={
            field.type === "tags"
              ? Array.isArray(value)
                ? (value as string[]).join("\n")
                : str(value)
              : str(value)
          }
          onChange={(e) =>
            onChange(
              field.type === "tags"
                ? e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                : e.target.value,
            )
          }
          placeholder={field.placeholder}
          className={base}
        />
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={str(value)}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(field.type === "number" ? e.target.value : e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
      {field.help && <p className="mt-1.5 text-xs text-white/40">{field.help}</p>}
    </div>
  );
}

export function CrudManager({
  table,
  itemLabel,
  fields,
  columns,
  orderBy = "sort_order",
  defaults,
}: {
  table: string;
  itemLabel: string;
  fields: CrudField[];
  columns: CrudColumn[];
  orderBy?: string;
  defaults: Row;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const anyDb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }> };
      insert: (v: Row) => Promise<{ error: { message: string } | null }>;
      update: (v: Row) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
  };

  const list = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      const { data, error } = await anyDb.from(table).select("*").order(orderBy, { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Row) => {
      const payload: Row = {};
      for (const f of fields) {
        let v = values[f.key];
        if (f.type === "number") v = v === "" || v === null || v === undefined ? 0 : Number(v);
        if (f.type === "boolean") v = Boolean(v);
        if (f.type === "tags") v = Array.isArray(v) ? v : [];
        if (f.required && (v === "" || v === null || v === undefined)) {
          throw new Error(`${f.label} is required.`);
        }
        payload[f.key] = v;
      }
      if (editing?.id) {
        const { error } = await anyDb.from(table).update(payload).eq("id", String(editing.id));
        if (error) throw new Error(error.message);
      } else {
        const { error } = await anyDb.from(table).insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(`${itemLabel} saved — the website is updated.`);
      setEditing(null);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await anyDb.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(`${itemLabel} deleted`);
      setConfirmId(null);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  const openNew = () => {
    setEditing({});
    setForm({ ...defaults });
  };
  const openEdit = (row: Row) => {
    setEditing(row);
    const next: Row = {};
    for (const f of fields) next[f.key] = row[f.key] ?? defaults[f.key] ?? (f.type === "tags" ? [] : "");
    setForm(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/50">
          {list.isLoading ? "Loading…" : `${list.data?.length ?? 0} item(s)`}
        </p>
        <button onClick={openNew} className="btn-primary !py-2.5 !px-5 text-sm">
          <Plus className="h-4 w-4" /> Add {itemLabel}
        </button>
      </div>

      {list.isError && (
        <div className="mt-6 card-premium p-6 text-sm text-primary">
          Could not load data. Please refresh and try again.
        </div>
      )}

      <div className="mt-6 card-premium overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-4 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((row) => (
              <tr key={String(row.id)} className="border-b border-white/5 last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-5 py-4 align-middle text-white/80">
                    {c.render ? c.render(row) : str(row[c.key])}
                  </td>
                ))}
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:border-primary/50 hover:text-primary"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmId(String(row.id))}
                      className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:border-primary/50 hover:text-primary"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.isLoading && (list.data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-10 text-center text-white/40">
                  Nothing here yet. Add your first {itemLabel.toLowerCase()}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={`${editing.id ? "Edit" : "Add"} ${itemLabel}`}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-5">
            {fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={form[f.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </Modal>
      )}

      {confirmId && (
        <Modal title={`Delete ${itemLabel}?`} onClose={() => setConfirmId(null)}>
          <p className="text-sm text-white/60">
            This will remove it from the website immediately. This cannot be undone.
          </p>
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
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 py-10 backdrop-blur-sm">
      <div className="card-premium w-full max-w-xl p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
