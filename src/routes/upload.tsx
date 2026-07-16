import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Trash2, Download, History } from "lucide-react";
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
  type UploadMeta,
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

function UploadPage() {
  const {
    clusters, tickets, analyst, history,
    setClusters, setTickets, setAnalyst, pushHistory, clearAll,
  } = useDataStore();
  const [append, setAppend] = useState(false);
  const [progress, setProgress] = useState<Record<Kind, number>>({ cluster: 0, ticket: 0, analyst: 0 });
  const [metas, setMetas] = useState<Partial<Record<Kind, UploadMeta>>>({});

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
