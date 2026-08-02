import { Download, Loader2, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/admin/CrudManager";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/gym/States";

export type Row = Record<string, unknown>;

export type Column = {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  csv?: (row: Row) => string;
};

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export type BulkAction = {
  label: string;
  values: Row;
  confirm?: string;
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function toCsv(rows: Row[], columns: Column[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(c.csv ? c.csv(r) : str(r[c.key]))).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function DataTable({
  rows,
  columns,
  searchKeys,
  filters = [],
  isLoading,
  isError,
  onRetry,
  onBulkDelete,
  onBulkUpdate,
  bulkActions = [],
  csvName = "export",
  rowActions,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  pageSize = 10,
  toolbarExtra,
}: {
  rows: Row[];
  columns: Column[];
  searchKeys: string[];
  filters?: FilterDef[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
  onBulkUpdate?: (ids: string[], values: Row) => Promise<void> | void;
  bulkActions?: BulkAction[];
  csvName?: string;
  rowActions?: (row: Row) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  toolbarExtra?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      for (const f of filters) {
        const val = filterState[f.key];
        if (val && str(r[f.key]) !== val) return false;
      }
      if (!needle) return true;
      return searchKeys.some((k) => str(r[k]).toLowerCase().includes(needle));
    });
  }, [rows, q, filterState, filters, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.includes(String(r.id)));

  const download = () => {
    const csv = toCsv(filtered, columns);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runBulk = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
      setSelected([]);
      setConfirmDelete(false);
      setPendingBulk(null);
    } finally {
      setBusy(false);
    }
  };

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search…"
            aria-label="Search"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-primary/60"
          />
        </div>

        {filters.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={filterState[f.key] ?? ""}
            onChange={(e) => {
              setFilterState((p) => ({ ...p, [f.key]: e.target.value }));
              setPage(0);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 outline-none focus:border-primary/60"
          >
            <option value="">{f.label}: all</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        {toolbarExtra}

        <button onClick={download} className="btn-ghost !py-2.5 !px-4 text-sm">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 card-premium flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-white/60">{selected.length} selected</span>
          {bulkActions.map((b) => (
            <button
              key={b.label}
              onClick={() => setPendingBulk(b)}
              className="btn-ghost !py-2 !px-4 text-sm"
            >
              {b.label}
            </button>
          ))}
          {onBulkDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost !py-2 !px-4 text-sm"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button onClick={() => setSelected([])} className="ml-auto text-xs text-white/50">
            Clear selection
          </button>
        </div>
      )}

      <div className="mt-5">
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? emptyTitle : "No matches"}
            description={
              rows.length === 0
                ? emptyDescription
                : "Try a different search term or clear the filters."
            }
          />
        ) : (
          <>
            <div className="card-premium overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
                    <th className="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all rows on this page"
                        checked={allVisibleSelected}
                        onChange={(e) =>
                          setSelected((prev) => {
                            const ids = visible.map((r) => String(r.id));
                            return e.target.checked
                              ? Array.from(new Set([...prev, ...ids]))
                              : prev.filter((id) => !ids.includes(id));
                          })
                        }
                        className="h-4 w-4 accent-[oklch(0.62_0.24_25)]"
                      />
                    </th>
                    {columns.map((c) => (
                      <th key={c.key} className="px-5 py-4 font-medium">
                        {c.label}
                      </th>
                    ))}
                    {rowActions && <th className="px-5 py-4" />}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const id = String(row.id);
                    return (
                      <tr key={id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selected.includes(id)}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((s) => s !== id),
                              )
                            }
                            className="h-4 w-4 accent-[oklch(0.62_0.24_25)]"
                          />
                        </td>
                        {columns.map((c) => (
                          <td key={c.key} className="px-5 py-4 align-top text-white/80">
                            {c.render ? c.render(row) : str(row[c.key])}
                          </td>
                        ))}
                        {rowActions && <td className="px-5 py-4">{rowActions(row)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
              <span>
                Showing {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)}{" "}
                of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, current - 1))}
                  disabled={current === 0}
                  className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {current + 1} / {pages}
                </span>
                <button
                  onClick={() => setPage(Math.min(pages - 1, current + 1))}
                  disabled={current >= pages - 1}
                  className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmDelete && onBulkDelete && (
        <Modal title={`Delete ${selected.length} item(s)?`} onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-white/60">This cannot be undone.</p>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void runBulk(() => onBulkDelete(selected))}
              disabled={busy}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </button>
          </div>
        </Modal>
      )}

      {pendingBulk && onBulkUpdate && (
        <Modal title={pendingBulk.label} onClose={() => setPendingBulk(null)}>
          <p className="text-sm text-white/60">
            {pendingBulk.confirm ??
              `Apply "${pendingBulk.label}" to ${selected.length} selected item(s)?`}
          </p>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setPendingBulk(null)} className="btn-ghost !py-2.5 !px-5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void runBulk(() => onBulkUpdate(selected, pendingBulk.values))}
              disabled={busy}
              className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Apply
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
