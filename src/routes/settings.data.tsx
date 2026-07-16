import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  Download,
  History,
  Sparkles,
  X,
  AlertCircle,
  Database,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  classifyFile,
  exportToExcel,
  downloadTemplate,
  fileChecksum,
  parseActionPlanFile,
  parseAnalystFile,
  parseClusterFile,
  parseCompetitorFile,
  parseTicketFile,
  type ImportKind,
  type UploadMeta,
} from "@/lib/excel";
import { useDataStore, type UploadHistoryEntry } from "@/lib/store";

export const Route = createFileRoute("/settings/data")({
  head: () => ({ meta: [{ title: "Data Management — MCA Workspace" }] }),
  component: UploadPage,
});

type Classified = {
  file: File;
  kind: ImportKind;
  fileName: string;
  sheetName: string;
  sheetCount: number;
  size: number;
  checksum: string;
  cached: boolean;
};

type StageKey = "scan" | "identify" | "validate" | "normalize" | "map" | "relate" | "refresh";
const STAGES: { key: StageKey; label: string }[] = [
  { key: "scan", label: "Scanning Workbook" },
  { key: "identify", label: "Identifying Dataset" },
  { key: "validate", label: "Validating Sheet & Header" },
  { key: "normalize", label: "Normalizing Data" },
  { key: "map", label: "Mapping to Database" },
  { key: "relate", label: "Building Relations" },
  { key: "refresh", label: "Refreshing Dashboard" },
];

const KIND_LABEL: Record<ImportKind, string> = {
  cluster: "Master Cluster",
  ticket: "Ticket",
  analyst: "Analyst Market",
  competitor: "Competitor",
  actionplan: "Action Plan",
};

type ImportSummary = {
  cluster?: { rows: number; kab: number; prov: number };
  ticket?: { rows: number; bulan: number };
  analyst?: { rows: number; ae: number };
  competitor?: { rows: number; unique: number; hargaMin: number; hargaMax: number; promo: number };
  actionplan?: { rows: number; pic: number; cluster: number; aktif: number; selesai: number; mendatang: number };
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function BulkImportZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        const fs = e.dataTransfer.files;
        if (fs?.length) onFiles(Array.from(fs));
      }}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition ${
        drag
          ? "border-primary bg-primary/10"
          : "border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files;
          if (fs?.length) onFiles(Array.from(fs));
          e.currentTarget.value = "";
        }}
      />
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <div className="font-display text-lg font-semibold">Bulk Excel Import</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Drag &amp; Drop banyak file .xlsx sekaligus — Cluster, Ticket, Analyst Market,
            Competitor terdeteksi otomatis (no config)
          </div>
        </div>
        <Button
          className="mt-1"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" /> Upload Multiple Files
        </Button>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Ctrl / Cmd + klik untuk pilih beberapa file
        </div>
      </div>
    </div>
  );
}

function ClassifiedList({
  items,
  onRemove,
}: {
  items: Classified[];
  onRemove: (idx: number) => void;
}) {
  const groups = useMemo(() => {
    const g: Record<ImportKind, Classified[]> = { cluster: [], ticket: [], analyst: [], competitor: [], actionplan: [] };
    items.forEach((it) => g[it.kind].push(it));
    return g;
  }, [items]);

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      {(Object.keys(groups) as ImportKind[]).map((k) => (
        <div key={k} className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <CheckCircle2
              className={`h-3.5 w-3.5 ${groups[k].length ? "text-success" : "text-muted-foreground/50"}`}
            />
            {KIND_LABEL[k]}
            <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[10px]">
              {groups[k].length}
            </span>
          </div>
          {groups[k].length === 0 && (
            <div className="text-[11px] text-muted-foreground">Belum ada file</div>
          )}
          <div className="space-y-1.5">
            {groups[k].map((it) => {
              const idx = items.indexOf(it);
              return (
                <div
                  key={it.checksum}
                  className="group flex items-center gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.fileName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {it.sheetName} · {formatBytes(it.size)}
                      {it.cached && (
                        <span className="ml-1 rounded bg-warning/15 px-1 text-warning">cache</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(idx)}
                    className="opacity-40 hover:opacity-100"
                    aria-label="remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineProgress({
  stage,
  overall,
  running,
}: {
  stage: StageKey | null;
  overall: number;
  running: boolean;
}) {
  if (!running && overall === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {stage ? STAGES.find((s) => s.key === stage)?.label : "Selesai"}…
        </div>
        <div className="font-mono text-muted-foreground">{overall}%</div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${overall}%` }}
          transition={{ duration: 0.4 }}
          className="h-full gradient-primary"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-7">
        {STAGES.map((s, i) => {
          const done = STAGES.findIndex((x) => x.key === stage) > i || overall === 100;
          const active = s.key === stage;
          return (
            <div
              key={s.key}
              className={`rounded-md px-1.5 py-1 text-center text-[9px] uppercase tracking-wide transition ${
                done
                  ? "bg-success/15 text-success"
                  : active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {s.label.split(" ")[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryResult({ summary }: { summary: ImportSummary }) {
  const items: { label: string; value: string; sub: string }[] = [];
  if (summary.cluster)
    items.push({
      label: "Master Cluster",
      value: summary.cluster.rows.toLocaleString("id-ID"),
      sub: `${summary.cluster.kab} Kabupaten · ${summary.cluster.prov} Provinsi`,
    });
  if (summary.ticket)
    items.push({
      label: "Ticket",
      value: summary.ticket.rows.toLocaleString("id-ID"),
      sub: `${summary.ticket.bulan} Bulan`,
    });
  if (summary.analyst)
    items.push({
      label: "Analyst Market",
      value: summary.analyst.rows.toLocaleString("id-ID"),
      sub: `${summary.analyst.ae} AE`,
    });
  if (summary.competitor)
    items.push({
      label: "Competitor",
      value: summary.competitor.rows.toLocaleString("id-ID"),
      sub: `${summary.competitor.unique} Kompetitor · Rp${summary.competitor.hargaMin.toLocaleString("id-ID")}–${summary.competitor.hargaMax.toLocaleString("id-ID")} · ${summary.competitor.promo} promo`,
    });
  if (summary.actionplan)
    items.push({
      label: "Action Plan",
      value: summary.actionplan.rows.toLocaleString("id-ID"),
      sub: `${summary.actionplan.pic} PIC · ${summary.actionplan.cluster} Cluster · ${summary.actionplan.aktif} Aktif · ${summary.actionplan.selesai} Selesai · ${summary.actionplan.mendatang} Mendatang`,
    });
  if (!items.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-success/40 bg-success/5 p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
        <CheckCircle2 className="h-4 w-4" /> Import Completed · Dashboard diperbarui
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg bg-background/70 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {it.label}
            </div>
            <div className="font-display text-2xl font-bold">{it.value}</div>
            <div className="text-[11px] text-muted-foreground">{it.sub}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function UploadPage() {
  const {
    clusters,
    tickets,
    analyst,
    competitorData,
    actionPlans,
    history,
    setClusters,
    setTickets,
    setAnalyst,
    setCompetitorData,
    setActionPlans,
    pushHistory,
    clearAll,
  } = useDataStore();

  const [queue, setQueue] = useState<Classified[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<StageKey | null>(null);
  const [overall, setOverall] = useState(0);
  const [summary, setSummary] = useState<ImportSummary>({});
  const [confirmMode, setConfirmMode] = useState<null | "prompt">(null);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);

  const hasData =
    clusters.length > 0 || tickets.length > 0 || analyst.length > 0 || competitorData.length > 0 || actionPlans.length > 0;
  const knownChecksums = useMemo(
    () => new Set(history.map((h) => h.checksum).filter(Boolean) as string[]),
    [history],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      setClassifying(true);
      setErrors([]);
      try {
        const results = await Promise.all(
          files.map(async (f) => {
            try {
              const [meta, checksum] = await Promise.all([classifyFile(f), fileChecksum(f)]);
              return {
                file: f,
                ...meta,
                checksum,
                cached: knownChecksums.has(checksum),
              } as Classified;
            } catch (e) {
              setErrors((prev) => [...prev, { name: f.name, message: (e as Error).message }]);
              return null;
            }
          }),
        );
        const ok = results.filter((r): r is Classified => r !== null);
        setQueue((q) => {
          const seen = new Set(q.map((x) => x.checksum));
          const merged = [...q];
          for (const r of ok) if (!seen.has(r.checksum)) merged.push(r);
          return merged;
        });
        if (ok.length) toast.success(`${ok.length} file terdeteksi otomatis`);
      } finally {
        setClassifying(false);
      }
    },
    [knownChecksums],
  );

  const removeAt = (i: number) => setQueue((q) => q.filter((_, idx) => idx !== i));

  const startImport = () => {
    if (!queue.length) return;
    if (hasData) setConfirmMode("prompt");
    else void runImport("replace");
  };

  const runImport = async (mode: "replace" | "append") => {
    setConfirmMode(null);
    setRunning(true);
    setSummary({});
    setErrors([]);
    setOverall(0);

    const advance = async (s: StageKey, pct: number) => {
      setStage(s);
      setOverall(pct);
      await new Promise((r) => setTimeout(r, 180));
    };

    try {
      await advance("scan", 8);
      await advance("identify", 18);
      await advance("validate", 28);
      await advance("normalize", 40);

      // Parse in parallel
      const parsePromises = queue.map(async (q) => {
        if (q.kind === "cluster") {
          const r = await parseClusterFile(q.file);
          return { q, kind: "cluster" as const, rows: r.rows, meta: r.meta };
        }
        if (q.kind === "ticket") {
          const r = await parseTicketFile(q.file);
          return { q, kind: "ticket" as const, rows: r.rows, meta: r.meta };
        }
        if (q.kind === "competitor") {
          const r = await parseCompetitorFile(q.file);
          return { q, kind: "competitor" as const, rows: r.rows, meta: r.meta };
        }
        const r = await parseAnalystFile(q.file);
        return { q, kind: "analyst" as const, rows: r.rows, meta: r.meta };
      });

      const results = await Promise.all(
        parsePromises.map((p) =>
          p.catch((e: Error) => ({ error: e.message }) as { error: string }),
        ),
      );

      await advance("map", 62);

      const buckets = {
        cluster: [] as Awaited<ReturnType<typeof parseClusterFile>>["rows"],
        ticket: [] as Awaited<ReturnType<typeof parseTicketFile>>["rows"],
        analyst: [] as Awaited<ReturnType<typeof parseAnalystFile>>["rows"],
        competitor: [] as Awaited<ReturnType<typeof parseCompetitorFile>>["rows"],
      };
      const metas: { kind: ImportKind; meta: UploadMeta; checksum: string }[] = [];

      results.forEach((res, i) => {
        if ("error" in res) {
          setErrors((prev) => [...prev, { name: queue[i].fileName, message: res.error }]);
          return;
        }
        if (res.kind === "cluster") buckets.cluster.push(...res.rows);
        else if (res.kind === "ticket") buckets.ticket.push(...res.rows);
        else if (res.kind === "competitor") buckets.competitor.push(...res.rows);
        else buckets.analyst.push(...res.rows);
        metas.push({ kind: res.kind, meta: res.meta, checksum: queue[i].checksum });
      });

      await advance("relate", 82);

      const sum: ImportSummary = {};
      if (buckets.cluster.length) {
        setClusters(buckets.cluster, mode);
        const kab = new Set(buckets.cluster.map((r) => r.kabupaten).filter(Boolean));
        const prov = new Set(buckets.cluster.map((r) => r.provinsi).filter(Boolean));
        sum.cluster = { rows: buckets.cluster.length, kab: kab.size, prov: prov.size };
      }
      if (buckets.ticket.length) {
        setTickets(buckets.ticket, mode);
        const bulan = new Set(buckets.ticket.map((r) => r.bulan).filter(Boolean));
        sum.ticket = { rows: buckets.ticket.length, bulan: bulan.size };
      }
      if (buckets.analyst.length) {
        setAnalyst(buckets.analyst, mode);
        const ae = new Set(buckets.analyst.map((r) => r.aeName).filter(Boolean));
        sum.analyst = { rows: buckets.analyst.length, ae: ae.size };
      }
      if (buckets.competitor.length) {
        setCompetitorData(buckets.competitor, mode);
        const unique = new Set(buckets.competitor.map((r) => r.competitor));
        const prices = buckets.competitor.map((r) => r.price).filter((p) => p > 0);
        const promo = new Set(buckets.competitor.map((r) => r.promoCategory));
        sum.competitor = {
          rows: buckets.competitor.length,
          unique: unique.size,
          hargaMin: prices.length ? Math.min(...prices) : 0,
          hargaMax: prices.length ? Math.max(...prices) : 0,
          promo: promo.size,
        };
      }
      metas.forEach((m) =>
        pushHistory({ ...m.meta, kind: m.kind, mode, checksum: m.checksum } as UploadHistoryEntry),
      );

      await advance("refresh", 96);
      setOverall(100);
      setStage(null);
      setSummary(sum);
      setQueue([]);
      toast.success("Import selesai · Dashboard diperbarui");
    } catch (e) {
      toast.error(`Gagal import: ${(e as Error).message}`);
    } finally {
      setRunning(false);
      setTimeout(() => setOverall(0), 1500);
    }
  };

  const exportAll = () => {
    if (clusters.length) exportToExcel(clusters as unknown as Record<string, unknown>[], "clusters.xlsx");
    if (tickets.length) exportToExcel(tickets as unknown as Record<string, unknown>[], "tickets.xlsx");
    if (analyst.length) exportToExcel(analyst as unknown as Record<string, unknown>[], "analyst.xlsx");
    if (competitorData.length)
      exportToExcel(competitorData as unknown as Record<string, unknown>[], "competitor.xlsx");
    toast.success("Data diekspor");
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-base">
                Smart Bulk Excel Import Engine
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAll}
              disabled={!hasData}
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulkImportZone onFiles={addFiles} disabled={running} />

            {classifying && (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Scanning workbook & menghitung checksum…
              </div>
            )}

            <AnimatePresence>
              {queue.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <ClassifiedList items={queue} onRemove={removeAt} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={startImport} disabled={running}>
                      <Zap className="mr-1 h-4 w-4" />
                      Import {queue.length} File
                    </Button>
                    <Button variant="ghost" onClick={() => setQueue([])} disabled={running}>
                      Kosongkan
                    </Button>
                    <div className="ml-auto text-[11px] text-muted-foreground">
                      Parsing paralel (Promise.all) · SHA-256 cache aktif
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <PipelineProgress stage={stage} overall={overall} running={running} />

            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
                <div className="mb-1 flex items-center gap-2 font-semibold text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.length} file gagal
                </div>
                {errors.map((e, i) => (
                  <div key={i} className="text-muted-foreground">
                    <span className="font-medium">{e.name}</span> — {e.message}
                  </div>
                ))}
              </div>
            )}

            <SummaryResult summary={summary} />

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
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("competitor")}>
                <Download className="mr-1 h-4 w-4" /> Template Competitor
              </Button>
              <div className="ml-auto text-xs text-muted-foreground">
                {clusters.length.toLocaleString("id-ID")} cluster ·{" "}
                {tickets.length.toLocaleString("id-ID")} ticket ·{" "}
                {analyst.length.toLocaleString("id-ID")} profiling ·{" "}
                {competitorData.length.toLocaleString("id-ID")} competitor
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Hapus semua data yang tersimpan?")) {
                    clearAll();
                    setSummary({});
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
                        <td className="py-1.5 pr-3">
                          {new Date(h.timestamp).toLocaleString("id-ID")}
                        </td>
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

      <Dialog open={confirmMode === "prompt"} onOpenChange={(o) => !o && setConfirmMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data lama terdeteksi</DialogTitle>
            <DialogDescription>
              Terdapat data existing. Pilih apakah data baru menggantikan (Replace) atau ditambahkan
              (Append) ke dataset yang ada.
              {queue.some((q) => q.cached) && (
                <div className="mt-2 rounded-md bg-warning/10 p-2 text-warning">
                  {queue.filter((q) => q.cached).length} file identik pernah diupload (SHA-256 sama).
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setConfirmMode(null)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => runImport("append")}>
                Append New Data
              </Button>
              <Button onClick={() => runImport("replace")}>Replace Existing</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
