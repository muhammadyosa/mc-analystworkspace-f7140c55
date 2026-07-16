import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Trash2, Download, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  parseClusterFile,
  parseTicketFile,
  parseAnalystFile,
  exportToExcel,
  downloadTemplate,
  smartImport,
  type UploadMeta,
  type ImportKind,
} from "@/lib/excel";
import { useDataStore, type UploadHistoryEntry } from "@/lib/store";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Data Management — MCA Workspace" }] }),
  component: UploadPage,
});

type Kind = "cluster" | "ticket" | "analyst";

function DropZone({
  label,
  hint,
  loaded,
  progress,
  onFile,
}: {
  label: string;
  hint: string;
  loaded?: number;
  progress?: number;
  onFile: (f: File) => void;
}) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
        drag ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50"
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-lg">
        {loaded ? <CheckCircle2 className="h-7 w-7 text-white" /> : <Upload className="h-7 w-7 text-white" />}
      </div>
      <div>
        <div className="font-display text-sm font-semibold">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      {progress !== undefined && progress > 0 && progress < 100 && (
        <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {loaded !== undefined && loaded > 0 && (
        <div className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
          {loaded} baris dimuat
        </div>
      )}
    </label>
  );
}

function MetaCard({ meta, kind }: { meta: UploadMeta; kind: Kind }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="h-4 w-4 text-success" /> File berhasil dibaca
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">{kind}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
        <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium">{meta.fileName}</span></div>
        <div><span className="text-muted-foreground">Sheet:</span> <span className="font-medium">{meta.sheetPicked}</span></div>
        <div><span className="text-muted-foreground">Total Sheet:</span> {meta.sheetCount}</div>
        <div><span className="text-muted-foreground">Rows:</span> {meta.rowCount}</div>
        {Object.entries(meta.extra).map(([k, v]) => (
          <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
        ))}
        <div>
          <span className="text-muted-foreground">Mapping:</span>{" "}
          <span className="font-medium text-success">{meta.mappingPct}%</span>
        </div>
      </div>
    </div>
  );
}

function SmartDropZone({
  running,
  log,
  onFiles,
}: {
  running: boolean;
  log: { name: string; kind: ImportKind; count: number; ok: boolean; error?: string }[];
  onFiles: (files: File[]) => void;
}) {
  const [drag, setDrag] = useState(false);
  const handle = (fl: FileList | null) => {
    if (!fl || !fl.length) return;
    onFiles(Array.from(fl));
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      className={`rounded-2xl border-2 border-dashed p-5 transition ${
        drag ? "border-primary bg-primary/5" : "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-display text-sm font-semibold">Smart Import — Drag beberapa file sekaligus</div>
          <div className="text-xs text-muted-foreground">
            Otomatis mendeteksi jenis file (Cluster / Ticket / Analyst) berdasarkan sheet, header, & isi. Fuzzy header matching aktif.
          </div>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { handle(e.target.files); e.currentTarget.value = ""; }}
          />
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90">
            <Upload className="h-3.5 w-3.5" /> Pilih File
          </span>
        </label>
      </div>
      {(running || log.length > 0) && (
        <div className="mt-4 space-y-1 rounded-xl border border-border/60 bg-background/50 p-3 text-xs">
          {log.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className={`h-3.5 w-3.5 ${l.ok ? "text-success" : "text-destructive"}`} />
              <span className="font-medium">{l.name}</span>
              <span className="uppercase text-muted-foreground">→ {l.kind}</span>
              <span className="ml-auto">
                {l.ok ? `${l.count.toLocaleString("id-ID")} baris` : (l.error ?? "gagal")}
              </span>
            </div>
          ))}
          {running && <div className="text-muted-foreground">Memproses…</div>}
        </div>
      )}
    </div>
  );
}

function UploadPage() {
  const {
    clusters, tickets, analyst, history,
    setClusters, setTickets, setAnalyst, pushHistory, clearAll,
  } = useDataStore();
  const [append, setAppend] = useState(false);
  const [progress, setProgress] = useState<Record<Kind, number>>({ cluster: 0, ticket: 0, analyst: 0 });
  const [metas, setMetas] = useState<Partial<Record<Kind, UploadMeta>>>({});
  const [smart, setSmart] = useState<{ running: boolean; log: { name: string; kind: ImportKind; count: number; ok: boolean; error?: string }[] }>({ running: false, log: [] });

  const runImport = async (kind: Kind, file: File) => {
    setProgress((p) => ({ ...p, [kind]: 20 }));
    try {
      let count = 0;
      let meta: UploadMeta;
      if (kind === "cluster") {
        const r = await parseClusterFile(file);
        setProgress((p) => ({ ...p, [kind]: 70 }));
        setClusters(r.rows, append ? "append" : "replace");
        count = r.rows.length;
        meta = r.meta;
      } else if (kind === "ticket") {
        const r = await parseTicketFile(file);
        setProgress((p) => ({ ...p, [kind]: 70 }));
        setTickets(r.rows, append ? "append" : "replace");
        count = r.rows.length;
        meta = r.meta;
      } else {
        const r = await parseAnalystFile(file);
        setProgress((p) => ({ ...p, [kind]: 70 }));
        setAnalyst(r.rows, append ? "append" : "replace");
        count = r.rows.length;
        meta = r.meta;
      }
      const entry: UploadHistoryEntry = { ...meta, kind, mode: append ? "append" : "replace" };
      pushHistory(entry);
      setMetas((m) => ({ ...m, [kind]: meta }));
      setProgress((p) => ({ ...p, [kind]: 100 }));
      toast.success(`${count} baris berhasil diimpor (${kind})`);
      setTimeout(() => setProgress((p) => ({ ...p, [kind]: 0 })), 800);
    } catch (e) {
      setProgress((p) => ({ ...p, [kind]: 0 }));
      toast.error(`Gagal impor ${kind}: ${(e as Error).message}`);
    }
  };

  const exportAll = () => {
    if (clusters.length) exportToExcel(clusters as unknown as Record<string, unknown>[], "clusters.xlsx");
    if (tickets.length) exportToExcel(tickets as unknown as Record<string, unknown>[], "tickets.xlsx");
    if (analyst.length) exportToExcel(analyst as unknown as Record<string, unknown>[], "analyst.xlsx");
    toast.success("Data diekspor");
  };

  const runSmartImport = async (files: File[]) => {
    if (!files.length) return;
    setSmart({ running: true, log: [] });
    // Group results so we can apply per-kind replace/append semantics once
    const buckets: Record<ImportKind, { rows: unknown[]; metas: UploadMeta[] }> = {
      cluster: { rows: [], metas: [] },
      ticket: { rows: [], metas: [] },
      analyst: { rows: [], metas: [] },
    };
    const log: { name: string; kind: ImportKind; count: number; ok: boolean; error?: string }[] = [];
    for (const f of files) {
      try {
        const r = await smartImport(f);
        buckets[r.kind].rows.push(...(r.rows as unknown[]));
        buckets[r.kind].metas.push(r.meta);
        log.push({ name: f.name, kind: r.kind, count: r.rows.length, ok: true });
      } catch (e) {
        log.push({ name: f.name, kind: "cluster", count: 0, ok: false, error: (e as Error).message });
      }
      setSmart({ running: true, log: [...log] });
    }
    // Apply
    const mode: "append" | "replace" = append ? "append" : "replace";
    if (buckets.cluster.rows.length) {
      setClusters(buckets.cluster.rows as never, mode);
      buckets.cluster.metas.forEach((m) => pushHistory({ ...m, kind: "cluster", mode }));
      setMetas((prev) => ({ ...prev, cluster: buckets.cluster.metas[buckets.cluster.metas.length - 1] }));
    }
    if (buckets.ticket.rows.length) {
      setTickets(buckets.ticket.rows as never, mode);
      buckets.ticket.metas.forEach((m) => pushHistory({ ...m, kind: "ticket", mode }));
      setMetas((prev) => ({ ...prev, ticket: buckets.ticket.metas[buckets.ticket.metas.length - 1] }));
    }
    if (buckets.analyst.rows.length) {
      setAnalyst(buckets.analyst.rows as never, mode);
      buckets.analyst.metas.forEach((m) => pushHistory({ ...m, kind: "analyst", mode }));
      setMetas((prev) => ({ ...prev, analyst: buckets.analyst.metas[buckets.analyst.metas.length - 1] }));
    }
    setSmart({ running: false, log });
    const ok = log.filter((l) => l.ok).length;
    toast.success(`Smart Import selesai · ${ok}/${files.length} file · dashboard diperbarui`);
  };

  return (
    <>
      <AppHeader title="Data Management" subtitle="Import Excel, kelola dataset, riwayat upload" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-base">Dynamic Excel Import Engine</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="mode" checked={append} onCheckedChange={setAppend} />
                <Label htmlFor="mode" className="text-xs">{append ? "Append" : "Replace"}</Label>
              </div>
              <Button variant="outline" size="sm" onClick={exportAll} disabled={!clusters.length && !tickets.length && !analyst.length}>
                <Download className="mr-1 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SmartDropZone
              running={smart.running}
              log={smart.log}
              onFiles={runSmartImport}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <DropZone
                label="PEMBAGIAN CLUSTER SIBT.xlsx"
                hint="Sheet: DATA CLUSTER · HC Jan–Jun, ticket, PIC"
                loaded={clusters.length}
                progress={progress.cluster}
                onFile={(f) => runImport("cluster", f)}
              />
              <DropZone
                label="ticket jan-jun.xlsx"
                hint="Pivot flatten otomatis · sheet dipilih auto"
                loaded={tickets.length}
                progress={progress.ticket}
                onFile={(f) => runImport("ticket", f)}
              />
              <DropZone
                label="ANALYST MARKET.xlsx"
                hint="Sheet: HASIL PROFILING · AE, Kompetitor, Insight"
                loaded={analyst.length}
                progress={progress.analyst}
                onFile={(f) => runImport("analyst", f)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {metas.cluster && <MetaCard meta={metas.cluster} kind="cluster" />}
              {metas.ticket && <MetaCard meta={metas.ticket} kind="ticket" />}
              {metas.analyst && <MetaCard meta={metas.analyst} kind="analyst" />}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("cluster")}>
                <Download className="mr-1 h-4 w-4" /> Template Cluster
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("ticket")}>
                <Download className="mr-1 h-4 w-4" /> Template Ticket
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("analyst")}>
                <Download className="mr-1 h-4 w-4" /> Template Analyst
              </Button>
              <div className="ml-auto text-xs text-muted-foreground">
                {clusters.length} cluster · {tickets.length} ticket · {analyst.length} profiling — tersimpan di device
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Hapus semua data yang tersimpan?")) {
                    clearAll();
                    setMetas({});
                    toast.info("Semua data dihapus");
                  }
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card className="glass-card border-0">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-base">Riwayat Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3">Waktu</th>
                      <th className="py-1.5 pr-3">File</th>
                      <th className="py-1.5 pr-3">Kind</th>
                      <th className="py-1.5 pr-3">Sheet</th>
                      <th className="py-1.5 pr-3">Rows</th>
                      <th className="py-1.5 pr-3">Mode</th>
                      <th className="py-1.5 pr-3">Mapping</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-1.5 pr-3">{new Date(h.timestamp).toLocaleString("id-ID")}</td>
                        <td className="py-1.5 pr-3 font-medium">{h.fileName}</td>
                        <td className="py-1.5 pr-3 uppercase">{h.kind}</td>
                        <td className="py-1.5 pr-3">{h.sheetPicked}</td>
                        <td className="py-1.5 pr-3">{h.rowCount}</td>
                        <td className="py-1.5 pr-3">{h.mode}</td>
                        <td className="py-1.5 pr-3 text-success">{h.mappingPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
