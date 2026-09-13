import { useMemo } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Database, Columns3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Dataset = {
  key: string;
  label: string;
  rows: Record<string, unknown>[];
  keyFields: string[];
  requiredFields: string[];
  numericFields: string[];
};

/** Ringkasan kualitas, kesegaran, dan validitas data workspace. */
export function DataHealthPanel() {
  const store = useDataStore();

  const datasets = useMemo<Dataset[]>(
    () => [
      {
        key: "cluster",
        label: "Cluster Master",
        rows: store.clusters as unknown as Record<string, unknown>[],
        keyFields: ["cluster"],
        requiredFields: ["cluster", "kabupaten", "provinsi"],
        numericFields: ["juni", "ticket"],
      },
      {
        key: "ticket",
        label: "Ticket",
        rows: store.tickets as unknown as Record<string, unknown>[],
        keyFields: ["cluster", "bulan"],
        requiredFields: ["cluster"],
        numericFields: ["jumlah"],
      },
      {
        key: "analyst",
        label: "Analyst Market",
        rows: store.analyst as unknown as Record<string, unknown>[],
        keyFields: ["id"],
        requiredFields: ["cluster"],
        numericFields: [],
      },
      {
        key: "competitor",
        label: "Competitor",
        rows: store.competitorData as unknown as Record<string, unknown>[],
        keyFields: ["id"],
        requiredFields: ["cluster"],
        numericFields: [],
      },
      {
        key: "actionplan",
        label: "Action Plan",
        rows: store.actionPlans as unknown as Record<string, unknown>[],
        keyFields: ["id"],
        requiredFields: ["cluster", "program", "pic"],
        numericFields: [],
      },
    ],
    [store.clusters, store.tickets, store.analyst, store.competitorData, store.actionPlans],
  );

  const report = useMemo(
    () =>
      datasets.map((d) => {
        const total = d.rows.length;
        const columns = total ? Object.keys(d.rows[0]).length : 0;
        const seen = new Set<string>();
        let duplicates = 0;
        let missing = 0;
        let invalid = 0;
        d.rows.forEach((r) => {
          const k = d.keyFields.map((f) => String(r[f] ?? "")).join("|");
          if (k.trim() && seen.has(k)) duplicates += 1;
          else seen.add(k);
          if (d.requiredFields.some((f) => !String(r[f] ?? "").trim())) missing += 1;
          if (d.numericFields.some((f) => r[f] !== undefined && !Number.isFinite(Number(r[f])))) invalid += 1;
        });
        const valid = Math.max(0, total - missing - invalid);
        const score = total ? Math.round((valid / total) * 100) : 0;
        return { ...d, total, columns, duplicates, missing, invalid, valid, score };
      }),
    [datasets],
  );

  const totalRows = report.reduce((a, r) => a + r.total, 0);
  const overall = totalRows ? Math.round((report.reduce((a, r) => a + r.valid, 0) / totalRows) * 100) : 0;
  const ageHours = store.lastUpdated ? (Date.now() - store.lastUpdated) / 3600000 : null;
  const freshness =
    ageHours === null ? "Belum ada data" : ageHours < 24 ? "Segar" : ageHours < 24 * 7 ? "Cukup segar" : "Kedaluwarsa";
  const freshTone =
    freshness === "Segar" ? "text-success" : freshness === "Cukup segar" ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border border-border/60 bg-muted/15 p-4 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Terakhir diperbarui
          </div>
          <p className="mt-1.5 font-display text-lg font-bold">
            {store.lastUpdated
              ? formatDistanceToNow(store.lastUpdated, { addSuffix: true, locale: idLocale })
              : "—"}
          </p>
          <p className={`text-xs font-medium ${freshTone}`}>{freshness}</p>
        </Card>
        <Card className="border border-border/60 bg-muted/15 p-4 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Database className="h-3.5 w-3.5" /> Total baris
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{totalRows.toLocaleString("id-ID")}</p>
        </Card>
        <Card className="border border-border/60 bg-muted/15 p-4 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Columns3 className="h-3.5 w-3.5" /> Dataset aktif
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">
            {report.filter((r) => r.total > 0).length} / {report.length}
          </p>
        </Card>
        <Card className="border border-border/60 bg-muted/15 p-4 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Skor kualitas
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{overall}%</p>
          <Progress value={overall} className="mt-2 h-1.5" />
        </Card>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/10">
        <div className="scroll-x hidden md:block">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Baris</TableHead>
                <TableHead className="text-right">Kolom</TableHead>
                <TableHead className="text-right">Valid</TableHead>
                <TableHead className="text-right">Nilai kosong</TableHead>
                <TableHead className="text-right">Duplikat</TableHead>
                <TableHead className="text-right">Tidak valid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.columns}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{r.valid.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning">{r.missing}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning">{r.duplicates}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{r.invalid}</TableCell>
                  <TableCell>
                    <StatusBadge total={r.total} score={r.score} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Mobile: baris menjadi kartu */}
        <div className="space-y-2 p-3 md:hidden">
          {report.map((r) => (
            <div key={r.key} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{r.label}</span>
                <StatusBadge total={r.total} score={r.score} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div>Baris: <b className="text-foreground">{r.total.toLocaleString("id-ID")}</b></div>
                <div>Kolom: <b className="text-foreground">{r.columns}</b></div>
                <div>Valid: <b className="text-success">{r.valid}</b></div>
                <div>Kosong: <b className="text-warning">{r.missing}</b></div>
                <div>Duplikat: <b className="text-warning">{r.duplicates}</b></div>
                <div>Tidak valid: <b className="text-destructive">{r.invalid}</b></div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Riwayat impor terakhir</p>
        {store.history.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada riwayat impor pada perangkat ini.</p>
        )}
        {store.history.slice(0, 8).map((h, i) => (
          <div
            key={`${h.fileName}-${i}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
          >
            <Badge variant="secondary" className="text-[10px]">{h.kind}</Badge>
            <span className="min-w-0 flex-1 truncate font-medium">{h.fileName}</span>
            <span className="text-muted-foreground">{h.rowCount?.toLocaleString("id-ID")} baris</span>
            <span className="text-muted-foreground">{h.mode}</span>
            <span className="text-muted-foreground">Mapping {Math.round(h.mappingPct ?? 0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ total, score }: { total: number; score: number }) {
  if (total === 0)
    return (
      <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
        <XCircle className="h-3 w-3" /> Kosong
      </Badge>
    );
  if (score >= 95)
    return (
      <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-[10px] text-success">
        <CheckCircle2 className="h-3 w-3" /> Sehat
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-[10px] text-warning">
      <AlertTriangle className="h-3 w-3" /> Perlu ditinjau
    </Badge>
  );
}
