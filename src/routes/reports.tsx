import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Printer, FileText, Calendar as CalendarIcon, Radar as RadarIcon, Lightbulb, Sparkles } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/lib/store";
import type { AnalystRow, ClusterRow, CompetitorRow, PromoCategory, TicketRow } from "@/lib/excel";

// Parse various profiling date formats to a Date (or null)
function parseProfilingDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30) or Unix timestamp.
    if (value > 20_000 && value < 100_000) {
      const excelDate = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
      return isNaN(excelDate.getTime()) ? null : excelDate;
    }
    const timestamp = new Date(value);
    return isNaN(timestamp.getTime()) ? null : timestamp;
  }
  const t = String(value).trim();
  if (!t) return null;
  // Angka murni (mis. "46216" atau "46216.93") = serial Excel / unix timestamp
  if (/^\d+(\.\d+)?$/.test(t)) return parseProfilingDate(Number(t));
  // ISO first
  const iso = new Date(t);
  if (!isNaN(iso.getTime()) && /^\d{4}-\d{1,2}-\d{1,2}/.test(t)) return iso;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const d = Number(m[1]); const mo = Number(m[2]) - 1;
    let y = Number(m[3]); if (y < 100) y += 2000;
    return new Date(y, mo, d);
  }
  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? null : d2;
}

function dateToKey(date: Date): string {
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function profilingDateKey(row: AnalystRow): string {
  const date = parseProfilingDate(row.profilingDate) || parseProfilingDate(row.timestamp);
  return date ? dateToKey(date) : "";
}

function formatDateID(key: string, compact = false): string {
  if (!key) return "Pilih tanggal";
  const date = new Date(`${key}T00:00:00`);
  if (isNaN(date.getTime())) return compact ? "Tanggal tidak valid" : "Tanggal tidak valid";
  try {
    return format(date, compact ? "dd MMM" : "dd MMM yyyy", { locale: idLocale });
  } catch {
    return compact ? "Tanggal tidak valid" : "Tanggal tidak valid";
  }
}

/** Tanggal lengkap dengan nama hari, mis. "Senin, 08 September 2026". */
function formatDateFullID(key: string): string {
  if (!key) return "Tanggal tidak valid";
  const date = new Date(`${key}T00:00:00`);
  if (isNaN(date.getTime())) return "Tanggal tidak valid";
  try {
    return format(date, "EEEE, dd MMMM yyyy", { locale: idLocale });
  } catch {
    return "Tanggal tidak valid";
  }
}

function ReportDatePicker({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const toValidDate = (key: string | undefined, endOfDay = false): Date | undefined => {
    if (!key) return undefined;
    const date = new Date(`${key}T${endOfDay ? "23:59:59" : "00:00:00"}`);
    return isNaN(date.getTime()) ? undefined : date;
  };
  const selected = toValidDate(value);
  const minDate = toValidDate(min);
  const maxDate = toValidDate(max, true);
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("h-9 w-full justify-start text-left font-normal sm:w-[170px]", !value && "text-muted-foreground")}>
            <CalendarIcon className="h-4 w-4" />
            {formatDateID(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => date && onChange(dateToKey(date))}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
            defaultMonth={selected ?? maxDate}
            locale={idLocale}
            initialFocus
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function exportProfilingExcel(rows: AnalystRow[], label: string) {
  const data = rows.map((r) => ({
    AE: r.aeName, Cluster: r.cluster, Tanggal: formatDateID(profilingDateKey(r)),
    Kompetitor: r.competitor, "Harga Kompetitor": r.competitorPrice, Promo: r.competitorPromo,
    Segmen: r.customerSegment, "Daya Beli": r.purchasingPower, Potensi: r.potential,
    "SF/MI": r.sfToday, "Close Won": r.closewonToday, Insight: r.aeInsight,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Profiling");
  XLSX.writeFile(wb, `report-profiling-${label}.xlsx`);
}

function exportProfilingPDF(rows: AnalystRow[], label: string) {
  const w = window.open("", "", "width=1000,height=1200");
  if (!w) return;
  const body = rows.map((r) => `<tr><td>${r.aeName || "-"}</td><td>${r.cluster || "-"}</td><td>${r.profilingDate || r.timestamp || "-"}</td><td>${r.competitor || "-"}</td><td>${r.potential || "-"}</td><td>${r.closewonToday}</td></tr>`).join("");
  w.document.write(`<html><head><title>Report Profiling</title><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}th,td{border:1px solid #ccc;padding:5px;text-align:left}th{background:#eee}</style></head><body><h1>Laporan Hasil Profiling</h1><div>Periode: ${label} · Total ${rows.length} record</div><table><thead><tr><th>AE</th><th>Cluster</th><th>Tanggal</th><th>Kompetitor</th><th>Potensi</th><th>Close Won</th></tr></thead><tbody>${body}</tbody></table></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function ProfilingSummary({ analyst, dFrom, dTo }: { analyst: AnalystRow[]; dFrom: string; dTo: string }) {
  // Filter memakai kunci tanggal yang sama dengan analisis harian (YYYY-MM-DD)
  // supaya kedua bagian selalu konsisten.
  const dated = useMemo(
    () => analyst.map((row) => ({ row, date: profilingDateKey(row) })).filter((i) => i.date),
    [analyst],
  );
  const items = useMemo(
    () => dated
      .filter((i) => (!dFrom || i.date >= dFrom) && (!dTo || i.date <= dTo))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [dated, dFrom, dTo],
  );
  const rows = items.map((i) => i.row);
  const skipped = analyst.length - dated.length;
  const rangeLabel = dFrom || dTo ? `${formatDateID(dFrom)} – ${formatDateID(dTo)}` : "semua tanggal";
  const totalAE = new Set(rows.map((r) => r.aeName).filter(Boolean)).size;
  const totalCluster = new Set(rows.map((r) => r.cluster).filter(Boolean)).size;
  const totalSF = rows.reduce((s, r) => s + (r.sfToday || 0), 0);
  const totalCW = rows.reduce((s, r) => s + (r.closewonToday || 0), 0);
  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-sm">Ringkasan Profiling (harian)</CardTitle>
            <p className="text-xs text-muted-foreground">Detail baris profiling untuk rentang {rangeLabel}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" disabled={!rows.length} onClick={() => exportProfilingExcel(rows, rangeLabel)}>
              <FileText className="mr-1 h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="h-8" disabled={!rows.length} onClick={() => exportProfilingPDF(rows, rangeLabel)}>
              <Printer className="mr-1 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Total: {fmtN(rows.length)}</Badge>
          <Badge variant="secondary">AE: {totalAE}</Badge>
          <Badge variant="secondary">Cluster: {totalCluster}</Badge>
          <Badge variant="secondary">SF: {fmtN(totalSF)}</Badge>
          <Badge variant="secondary">Close Won: {fmtN(totalCW)}</Badge>
          {skipped > 0 && <Badge variant="outline">{fmtN(skipped)} baris tanpa tanggal valid</Badge>}
        </div>
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Tidak ada profiling di rentang tanggal ini.</div>
        ) : (
          <div className="scroll-x max-h-72 overflow-y-auto">
            <table className="w-full min-w-[680px] text-xs">
              <thead className="sticky top-0 bg-muted/40 text-[10px] uppercase text-muted-foreground">
                <tr><th className="p-2 text-left">Tanggal</th><th className="p-2 text-left">AE</th><th className="p-2 text-left">Cluster</th><th className="p-2 text-left">Kompetitor</th><th className="p-2 text-left">Potensi</th><th className="p-2 text-right">SF</th><th className="p-2 text-right">Close Won</th></tr>
              </thead>
              <tbody>
                {items.slice(0, 200).map(({ row: r, date }) => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="whitespace-nowrap p-2 font-medium">{formatDateID(date)}</td>
                    <td className="p-2">{r.aeName || "—"}</td>
                    <td className="p-2">{r.cluster || "—"}</td>
                    <td className="p-2 text-muted-foreground">{r.competitor || "—"}</td>
                    <td className="p-2">{r.potential || "—"}</td>
                    <td className="p-2 text-right tabular-nums">{fmtN(r.sfToday || 0)}</td>
                    <td className="p-2 text-right font-semibold tabular-nums text-success">{fmtN(r.closewonToday || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <div className="mt-2 text-center text-[10px] text-muted-foreground">Menampilkan 200 dari {fmtN(rows.length)}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyDailyAnalysis({ analyst, from, to, onFrom, onTo }: { analyst: AnalystRow[]; from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  const datedRows = useMemo(() => analyst.map((row) => ({ row, date: profilingDateKey(row) })).filter((item) => item.date), [analyst]);
  const invalidDateCount = analyst.length - datedRows.length;
  const bounds = useMemo(() => {
    const dates = datedRows.map((item) => item.date).sort();
    return { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" };
  }, [datedRows]);
  const effectiveFrom = from || bounds.min;
  const effectiveTo = to || bounds.max;
  const selectedRows = useMemo(
    () => datedRows.filter((item) => (!effectiveFrom || item.date >= effectiveFrom) && (!effectiveTo || item.date <= effectiveTo)),
    [datedRows, effectiveFrom, effectiveTo],
  );
  const daily = useMemo(() => {
    const grouped = new Map<string, AnalystRow[]>();
    selectedRows.forEach(({ row, date }) => grouped.set(date, [...(grouped.get(date) ?? []), row]));
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => {
      const sf = rows.reduce((sum, row) => sum + (row.sfToday || 0), 0);
      const closeWon = rows.reduce((sum, row) => sum + (row.closewonToday || 0), 0);
      return {
        date,
        tanggal: formatDateID(date, true),
        profiling: rows.length,
        ae: new Set(rows.map((row) => row.aeName).filter(Boolean)).size,
        cluster: new Set(rows.map((row) => row.cluster).filter(Boolean)).size,
        sf,
        closeWon,
        conversion: sf > 0 ? (closeWon / sf) * 100 : 0,
      };
    });
  }, [selectedRows]);
  const totals = useMemo(() => {
    const rows = selectedRows.map((item) => item.row);
    const sf = rows.reduce((sum, row) => sum + (row.sfToday || 0), 0);
    const closeWon = rows.reduce((sum, row) => sum + (row.closewonToday || 0), 0);
    return {
      profiling: rows.length,
      ae: new Set(rows.map((row) => row.aeName).filter(Boolean)).size,
      cluster: new Set(rows.map((row) => row.cluster).filter(Boolean)).size,
      sf,
      closeWon,
      conversion: sf > 0 ? (closeWon / sf) * 100 : 0,
    };
  }, [selectedRows]);
  const best = [...daily].sort((a, b) => b.closeWon - a.closeWon || b.profiling - a.profiling)[0];
  const low = [...daily].sort((a, b) => a.closeWon - b.closeWon || a.profiling - b.profiling)[0];
  const rangeLabel = effectiveFrom || effectiveTo ? `${formatDateID(effectiveFrom)} – ${formatDateID(effectiveTo)}` : "Semua tanggal";
  const exportRows = selectedRows.map((item) => item.row);

  return (
    <section className="space-y-4" aria-labelledby="weekly-daily-title">
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardTitle id="weekly-daily-title" className="font-display text-base">Analisis Profiling Harian</CardTitle>
              <p className="text-xs text-muted-foreground">Analisis mengikuti tanggal aktual pada file profiling.</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] font-medium">
                  Data valid: {bounds.min ? `${formatDateID(bounds.min)} – ${formatDateID(bounds.max)}` : "belum ada"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-medium">Rentang dipilih: {rangeLabel}</Badge>
                {invalidDateCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-medium text-warning">{fmtN(invalidDateCount)} baris tanpa tanggal valid (dilewati)</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <ReportDatePicker label="Tanggal mulai" value={effectiveFrom} onChange={onFrom} min={bounds.min} max={effectiveTo || bounds.max} />
              <ReportDatePicker label="Tanggal akhir" value={effectiveTo} onChange={onTo} min={effectiveFrom || bounds.min} max={bounds.max} />
              <div className="flex gap-2">
                {(from || to) && (
                  <Button size="sm" variant="ghost" className="h-9" onClick={() => { onFrom(""); onTo(""); }}>Reset</Button>
                )}
                <Button size="sm" variant="outline" className="h-9" disabled={!exportRows.length} onClick={() => exportProfilingExcel(exportRows, `${effectiveFrom}-${effectiveTo}`)}><FileText /> Excel</Button>
                <Button size="sm" variant="outline" className="h-9" disabled={!exportRows.length} onClick={() => exportProfilingPDF(exportRows, rangeLabel)}><Printer /> PDF</Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {daily.length === 0 ? (
        <Card className="glass-card border-0"><CardContent className="py-12 text-center text-sm text-muted-foreground">Tidak ada data profiling pada rentang tanggal ini.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total Profiling" value={totals.profiling} hint={`${daily.length} hari aktif`} />
            <KpiCard label="AE Aktif" value={totals.ae} hint={rangeLabel} />
            <KpiCard label="Cluster Tercakup" value={totals.cluster} hint="cluster unik" />
            <KpiCard label="Total SF" value={totals.sf} tone="warn" hint="sesuai tanggal" />
            <KpiCard label="Close Won" value={totals.closeWon} tone="up" hint="hasil profiling" />
            <KpiCard label="Konversi" value={`${totals.conversion.toFixed(1)}%`} tone={totals.conversion > 0 ? "up" : "warn"} hint="Close Won / SF" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card border-0">
              <CardHeader><CardTitle className="font-display text-sm">Tren SF & Close Won per Tanggal</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <LineChart data={daily} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="tanggal" fontSize={10} minTickGap={18} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip labelFormatter={(_, payload) => payload[0]?.payload?.date ? formatDateID(payload[0].payload.date) : ""} formatter={(value: number, name: string) => [fmtN(value), name === "sf" ? "SF" : "Close Won"]} />
                    <Legend formatter={(value) => value === "sf" ? "SF" : "Close Won"} />
                    <Line type="monotone" dataKey="sf" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="closeWon" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardHeader><CardTitle className="font-display text-sm">Aktivitas Profiling per Tanggal</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={daily} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="tanggal" fontSize={10} minTickGap={18} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip labelFormatter={(_, payload) => payload[0]?.payload?.date ? formatDateID(payload[0].payload.date) : ""} formatter={(value: number, name: string) => [fmtN(value), name === "profiling" ? "Profiling" : "Cluster"]} />
                    <Legend formatter={(value) => value === "profiling" ? "Profiling" : "Cluster"} />
                    <Bar dataKey="profiling" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cluster" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-sm">Ringkasan Analisis per Tanggal</CardTitle></CardHeader>
            <CardContent><div className="scroll-x max-h-80 overflow-y-auto"><table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Tanggal</th><th className="p-2 text-right">Profiling</th><th className="p-2 text-right">AE</th><th className="p-2 text-right">Cluster</th><th className="p-2 text-right">SF</th><th className="p-2 text-right">Close Won</th><th className="p-2 text-right">Konversi</th></tr></thead>
              <tbody>{daily.map((day) => <tr key={day.date} className="border-t"><td className="p-2 font-medium"><div>{formatDateID(day.date)}</div><div className="text-[10px] font-normal text-muted-foreground">{formatDateFullID(day.date).split(",")[0]}</div></td><td className="p-2 text-right">{fmtN(day.profiling)}</td><td className="p-2 text-right">{day.ae}</td><td className="p-2 text-right">{day.cluster}</td><td className="p-2 text-right">{fmtN(day.sf)}</td><td className="p-2 text-right font-semibold text-success">{fmtN(day.closeWon)}</td><td className="p-2 text-right">{day.conversion.toFixed(1)}%</td></tr>)}</tbody>
            </table></div></CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightBox items={[
              `Periode ${formatDateFullID(effectiveFrom)} sampai ${formatDateFullID(effectiveTo)}: ${fmtN(totals.profiling)} profiling dalam ${daily.length} hari aktif oleh ${totals.ae} AE di ${totals.cluster} cluster.`,
              best ? `Hari terbaik: ${formatDateFullID(best.date)} dengan ${fmtN(best.closeWon)} Close Won dari ${fmtN(best.sf)} SF.` : "Belum ada hari terbaik yang dapat dihitung.",
              low && daily.length > 1 ? `Hari terendah: ${formatDateFullID(low.date)} dengan ${fmtN(low.closeWon)} Close Won dari ${fmtN(low.profiling)} profiling.` : `Konversi keseluruhan ${totals.conversion.toFixed(1)}%.`,
              `Konversi keseluruhan mencapai ${totals.conversion.toFixed(1)}% (${fmtN(totals.closeWon)} Close Won dari ${fmtN(totals.sf)} SF).`,
            ]} />
            <RecommendationBox items={[
              best ? `Pelajari aktivitas AE pada ${formatDateFullID(best.date)} dan terapkan pola yang sama pada hari berikutnya.` : "Lengkapi data aktivitas harian untuk membentuk rekomendasi.",
              low && daily.length > 1 ? `Evaluasi cakupan dan follow-up pada ${formatDateFullID(low.date)} karena menghasilkan Close Won terendah.` : "Pertahankan konsistensi follow-up profiling setiap hari.",
              totals.conversion < 20 ? "Perkuat follow-up lead dan kualitas profiling untuk meningkatkan konversi." : "Pertahankan kualitas profiling dan prioritaskan cluster dengan konversi terbaik.",
            ]} />
          </div>
        </>
      )}
    </section>
  );
}

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MCA Workspace" },
      { name: "description", content: "Laporan mingguan, bulanan, profiling, ticket, HC, dan intelligence kompetitor." },
      { property: "og:title", content: "Reports — MCA Workspace" },
      { property: "og:description", content: "Laporan mingguan, bulanan, profiling, ticket, HC, dan intelligence kompetitor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];
const MONTHS = [
  { key: "januari", label: "Jan" },
  { key: "februari", label: "Feb" },
  { key: "maret", label: "Mar" },
  { key: "april", label: "Apr" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Jun" },
  { key: "juli", label: "Jul" },
  { key: "agustus", label: "Agt" },
  { key: "september", label: "Sep" },
  { key: "oktober", label: "Okt" },
  { key: "november", label: "Nov" },
  { key: "desember", label: "Des" },
] as const;
type MonthKey = typeof MONTHS[number]["key"];

const hcOf = (c: ClusterRow, key: MonthKey): number =>
  Number((c as unknown as Record<string, unknown>)[key]) || 0;

// Bulan yang benar-benar punya data (HC cluster atau ticket) — supaya range
// mengikuti bulan terakhir pada file yang diupload, bukan dipatok sampai Juni.
function ticketByMonthMap(tickets: TicketRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tickets) {
    const k = (t.bulan || "").toLowerCase();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + (t.ticket || 0));
  }
  return m;
}

/** cluster (uppercase) -> bulan -> jumlah ticket, untuk analisa per range bulan. */
function ticketByClusterMap(tickets: TicketRow[]): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const t of tickets) {
    const c = (t.cluster || "").trim().toUpperCase();
    const k = (t.bulan || "").toLowerCase();
    if (!c || !k) continue;
    const inner = m.get(c) ?? new Map<string, number>();
    inner.set(k, (inner.get(k) ?? 0) + (t.ticket || 0));
    m.set(c, inner);
  }
  return m;
}

function availableMonths(clusters: ClusterRow[], ticketMap: Map<string, number>): number[] {
  const idx = MONTHS.map((m, i) => {
    const hc = clusters.reduce((a, c) => a + (Number((c as unknown as Record<string, unknown>)[m.key]) || 0), 0);
    const tk = ticketMap.get(m.key) ?? 0;
    return hc > 0 || tk > 0 ? i : -1;
  }).filter((i) => i >= 0);
  return idx.length ? idx : [0, 1, 2, 3, 4, 5];
}


const fmtRp = (n: number) => (!n ? "-" : `Rp${n.toLocaleString("id-ID")}`);
const fmtN = (n: number) => n.toLocaleString("id-ID");

function threatScore(rows: CompetitorRow[]): number {
  const count = new Set(rows.map((r) => r.competitor)).size;
  const avgPrice = rows.length ? rows.reduce((s, r) => s + (r.price || 0), 0) / rows.length : 0;
  const promoCount = new Set(rows.map((r) => r.promoCategory).filter((c) => c !== "Tidak Ada Promo")).size;
  const countScore = Math.min(count / 5, 1) * 100;
  const priceScore = avgPrice > 0 ? Math.max(0, 100 - Math.min((avgPrice / 300000) * 100, 100)) : 40;
  const promoScore = Math.min(promoCount / 4, 1) * 100;
  return Math.round(countScore * 0.4 + priceScore * 0.3 + promoScore * 0.3);
}

function DateRange({ from, to, onFrom, onTo, avail }: { from: number; to: number; onFrom: (i: number) => void; onTo: (i: number) => void; avail: number[] }) {
  const opts = avail.map((i) => ({ i, ...MONTHS[i] }));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Range:</span>
      <Select value={String(from)} onValueChange={(v) => onFrom(Number(v))}>
        <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map((m) => <SelectItem key={m.key} value={String(m.i)} disabled={m.i > to}>{m.label} 2026</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">→</span>
      <Select value={String(to)} onValueChange={(v) => onTo(Number(v))}>
        <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map((m) => <SelectItem key={m.key} value={String(m.i)} disabled={m.i < from}>{m.label} 2026</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}


function KpiCard({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "up" | "down" | "warn" }) {
  const toneCls = tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : tone === "warn" ? "text-warning" : "";
  return (
    <Card className="glass-card border-0">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 font-display text-xl font-bold ${toneCls}`}>{typeof value === "number" ? fmtN(value) : value}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ProgressCard({ title, items }: { title: string; items: { label: string; value: number; total: number; color?: string }[] }) {
  return (
    <Card className="glass-card border-0">
      <CardHeader><CardTitle className="font-display text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => {
          const pct = it.total > 0 ? Math.round((it.value / it.total) * 100) : 0;
          return (
            <div key={it.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{it.label}</span>
                <span className="text-muted-foreground">{fmtN(it.value)} / {fmtN(it.total)} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function InsightBox({ items }: { items: string[] }) {
  return (
    <Card className="glass-card border-0 border-l-4 border-l-primary">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 font-display text-sm"><Sparkles className="h-4 w-4 text-primary" /> Insight Box</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {items.map((t, i) => <p key={i}>• {t}</p>)}
      </CardContent>
    </Card>
  );
}

function RecommendationBox({ items }: { items: string[] }) {
  return (
    <Card className="glass-card border-0 border-l-4 border-l-success">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 font-display text-sm"><Lightbulb className="h-4 w-4 text-success" /> Recommendation Box</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {items.map((t, i) => (
          <div key={i} className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>
            <span>{t}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function computeStats(
  clusters: ClusterRow[],
  from: number,
  to: number,
  ticketMap: Map<string, number> = new Map(),
  clusterTicketMap: Map<string, Map<string, number>> = new Map(),
) {
  const range = MONTHS.slice(from, to + 1);
  const hcTrend = range.map((m) => ({
    bulan: m.label,
    hc: clusters.reduce((a, c) => a + hcOf(c, m.key), 0),
  }));
  const start = hcTrend[0]?.hc ?? 0;
  const end = hcTrend[hcTrend.length - 1]?.hc ?? 0;
  const growth = start > 0 ? ((end - start) / start) * 100 : 0;

  const hasRealTicket = range.some((m) => (ticketMap.get(m.key) ?? 0) > 0);
  const fallbackTotalTicket = clusters.reduce((a, c) => a + c.ticket, 0);
  const totalHCAll = clusters.reduce((a, c) => a + c.grandTotal, 0);

  // Ticket per cluster mengikuti range bulan yang dipilih (bila data ticket ada).
  // Nama cluster antar file bisa beda tanda baca/spasi, jadi cocokkan juga
  // versi ternormalisasi (hanya huruf & angka).
  const normKey = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normTicketMap = new Map<string, Map<string, number>>();
  clusterTicketMap.forEach((v, k) => {
    const nk = normKey(k);
    const cur = normTicketMap.get(nk);
    if (!cur) normTicketMap.set(nk, new Map(v));
    else v.forEach((tv, tk) => cur.set(tk, (cur.get(tk) ?? 0) + tv));
  });
  const ticketOf = (cluster: string) => {
    if (!hasRealTicket) return 0;
    const inner =
      clusterTicketMap.get((cluster || "").trim().toUpperCase()) ?? normTicketMap.get(normKey(cluster));
    if (!inner) return 0;
    return range.reduce((a, m) => a + (inner.get(m.key) ?? 0), 0);
  };

  const perCluster = clusters.map((c) => {
    const hcStart = hcOf(c, MONTHS[from].key);
    const hcEnd = hcOf(c, MONTHS[to].key);
    const rangeTicket = hasRealTicket ? ticketOf(c.cluster) : c.ticket;
    return {
      ...c,
      ticket: rangeTicket,
      hcStart,
      hcEnd,
      delta: hcEnd - hcStart,
      ticketPer100HC: hcEnd > 0 ? (rangeTicket / hcEnd) * 100 : 0,
    };
  });

  const totalTicket = hasRealTicket
    ? range.reduce((a, m) => a + (ticketMap.get(m.key) ?? 0), 0)
    : fallbackTotalTicket;

  const topGrowth = [...perCluster].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const topDecline = [...perCluster].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const topHC = [...perCluster].sort((a, b) => b.hcEnd - a.hcEnd).slice(0, 8).map((c) => ({ cluster: c.cluster, hc: c.hcEnd }));
  const topTicket = [...perCluster].sort((a, b) => b.ticket - a.ticket).slice(0, 8).map((c) => ({ cluster: c.cluster, ticket: c.ticket }));
  const worstRatio = [...perCluster]
    .filter((c) => c.hcEnd >= 20 && c.ticket > 0)
    .sort((a, b) => b.ticketPer100HC - a.ticketPer100HC)
    .slice(0, 5);

  const ticketTrend = range.map((m) => {
    if (hasRealTicket) return { bulan: m.label, ticket: ticketMap.get(m.key) ?? 0 };
    // fallback: distribusi total ticket berdasar bobot HC
    const monthHC = clusters.reduce((a, c) => a + hcOf(c, m.key), 0);
    return { bulan: m.label, ticket: totalHCAll > 0 ? Math.round((monthHC / totalHCAll) * fallbackTotalTicket) : 0 };
  });
  const tStart = ticketTrend[0]?.ticket ?? 0;
  const tEnd = ticketTrend[ticketTrend.length - 1]?.ticket ?? 0;
  const ticketGrowth = tStart > 0 ? ((tEnd - tStart) / tStart) * 100 : 0;
  const peakTicket = [...ticketTrend].sort((a, b) => b.ticket - a.ticket)[0] ?? { bulan: "-", ticket: 0 };
  const avgTicketPerMonth = ticketTrend.length ? Math.round(totalTicket / ticketTrend.length) : 0;
  const ticketPer100HC = end > 0 ? (tEnd / end) * 100 : 0;
  const clustersWithTicket = perCluster.filter((c) => c.ticket > 0).length;

  const picMap = new Map<string, { hc: number; ticket: number }>();
  perCluster.forEach((c) => {
    const p = c.pic || "-";
    const cur = picMap.get(p) ?? { hc: 0, ticket: 0 };
    cur.hc += c.hcEnd; cur.ticket += c.ticket; picMap.set(p, cur);
  });
  const picPerf = Array.from(picMap.entries())
    .map(([pic, v]) => ({ pic, ...v, ratio: v.hc > 0 ? (v.ticket / v.hc) * 100 : 0 }))
    .sort((a, b) => b.hc - a.hc)
    .slice(0, 8);

  return {
    hcTrend, ticketTrend, start, end, growth, totalTicket, topGrowth, topDecline, topHC, topTicket,
    picPerf, perCluster, hasRealTicket, ticketGrowth, peakTicket, avgTicketPerMonth,
    ticketPer100HC, clustersWithTicket, worstRatio,
  };
}

function ReportsPage() {
  const clusters = useDataStore((s) => s.clusters);
  const actions = useDataStore((s) => s.actions);
  const competitorData = useDataStore((s) => s.competitorData);
  const tickets = useDataStore((s) => s.tickets);
  const weeklyRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);

  // Bila file ticket terpisah belum diupload, pakai kolom ticket bulanan
  // yang sudah ada di file cluster agar analisa ticket tetap terisi.
  const effTickets = useMemo<TicketRow[]>(() => {
    if (tickets.length) return tickets;
    const out: TicketRow[] = [];
    for (const c of clusters) {
      const byMonth = (c as unknown as { ticketByMonth?: Record<string, number> }).ticketByMonth;
      if (!byMonth) continue;
      for (const [bulan, val] of Object.entries(byMonth)) {
        if (!val) continue;
        out.push({ cluster: c.cluster, bulan, ticket: val, kategori: "", penyebab: "", status: "" });
      }
    }
    return out;
  }, [tickets, clusters]);

  const ticketMap = useMemo(() => ticketByMonthMap(effTickets), [effTickets]);
  const avail = useMemo(() => availableMonths(clusters, ticketMap), [clusters, ticketMap]);
  const first = avail[0];
  const lastM = avail[avail.length - 1];
  const prevM = avail.length > 1 ? avail[avail.length - 2] : first;

  const [wFrom, setWFrom] = useState(prevM);
  const [wTo, setWTo] = useState(lastM);
  const [mFrom, setMFrom] = useState(first);
  const [mTo, setMTo] = useState(lastM);
  const [cFrom, setCFrom] = useState(first);
  const [cTo, setCTo] = useState(lastM);

  // Sinkronkan range bila data baru punya bulan terakhir yang berbeda
  const monthRangeKey = `${first}-${lastM}`;
  const [syncKey, setSyncKey] = useState(monthRangeKey);
  useEffect(() => {
    if (syncKey === monthRangeKey) return;
    setSyncKey(monthRangeKey);
    setWFrom(prevM); setWTo(lastM);
    setMFrom(first); setMTo(lastM);
    setCFrom(first); setCTo(lastM);
  }, [first, lastM, monthRangeKey, prevM, syncKey]);

  const [wDFrom, setWDFrom] = useState(""); const [wDTo, setWDTo] = useState("");
  const analyst = useDataStore((s) => s.analyst);

  const clusterTicketMap = useMemo(() => ticketByClusterMap(effTickets), [effTickets]);
  const weekly = useMemo(() => clusters.length ? computeStats(clusters, wFrom, wTo, ticketMap, clusterTicketMap) : null, [clusters, wFrom, wTo, ticketMap, clusterTicketMap]);
  const monthly = useMemo(() => clusters.length ? computeStats(clusters, mFrom, mTo, ticketMap, clusterTicketMap) : null, [clusters, mFrom, mTo, ticketMap, clusterTicketMap]);
  const compBase = useMemo(() => clusters.length ? computeStats(clusters, cFrom, cTo, ticketMap, clusterTicketMap) : null, [clusters, cFrom, cTo, ticketMap, clusterTicketMap]);


  const compCharts = useMemo(() => {
    if (!competitorData.length) return null;
    const compCount = new Map<string, number>();
    const promoCount = new Map<PromoCategory, number>();
    const priceByComp = new Map<string, number[]>();
    const clusterGroup = new Map<string, CompetitorRow[]>();
    competitorData.forEach((r) => {
      compCount.set(r.competitor, (compCount.get(r.competitor) ?? 0) + 1);
      promoCount.set(r.promoCategory, (promoCount.get(r.promoCategory) ?? 0) + 1);
      if (r.price > 0) {
        if (!priceByComp.has(r.competitor)) priceByComp.set(r.competitor, []);
        priceByComp.get(r.competitor)!.push(r.price);
      }
      if (r.cluster) {
        if (!clusterGroup.has(r.cluster)) clusterGroup.set(r.cluster, []);
        clusterGroup.get(r.cluster)!.push(r);
      }
    });
    const topCompetitors = Array.from(compCount.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
    const promoBreakdown = Array.from(promoCount.entries()).map(([name, value]) => ({ name, value }));
    const priceRange = Array.from(priceByComp.entries()).map(([name, arr]) => ({
      name, min: Math.min(...arr),
      avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      max: Math.max(...arr),
    })).sort((a, b) => a.avg - b.avg).slice(0, 8);
    const threats = Array.from(clusterGroup.entries()).map(([cluster, rows]) => ({ cluster, score: threatScore(rows), competitors: new Set(rows.map((r) => r.competitor)).size, avgPrice: rows.reduce((a, b) => a + (b.price || 0), 0) / (rows.filter((r) => r.price > 0).length || 1) }));
    const threatBuckets = [
      { name: "Rendah", value: threats.filter((t) => t.score < 41).length },
      { name: "Sedang", value: threats.filter((t) => t.score >= 41 && t.score < 71).length },
      { name: "Tinggi", value: threats.filter((t) => t.score >= 71).length },
    ];
    const topThreats = [...threats].sort((a, b) => b.score - a.score).slice(0, 8);
    return {
      totalCompetitors: compCount.size, totalClusters: clusterGroup.size,
      highThreat: threatBuckets[2].value, dominant: topCompetitors[0]?.name ?? "-",
      avgPriceAll: Math.round(competitorData.filter((r) => r.price > 0).reduce((a, b) => a + b.price, 0) / (competitorData.filter((r) => r.price > 0).length || 1)),
      topCompetitors, promoBreakdown, priceRange, threatBuckets, topThreats, threats,
    };
  }, [competitorData]);

  // Cross-analysis: ancaman kompetitor x performa HC & ticket pada range terpilih
  const compRisk = useMemo(() => {
    if (!compCharts || !compBase) return null;
    const byCluster = new Map(compBase.perCluster.map((c) => [c.cluster.trim().toUpperCase(), c]));
    const rows = compCharts.threats.map((t) => {
      const c = byCluster.get(t.cluster.trim().toUpperCase());
      const delta = c?.delta ?? 0;
      const ticket = c?.ticket ?? 0;
      const hc = c?.hcEnd ?? 0;
      const risk = Math.round(
        t.score * 0.5 + (delta < 0 ? 30 : 0) + Math.min(20, (hc > 0 ? (ticket / hc) * 100 : 0) * 2),
      );
      return { ...t, delta, ticket, hc, risk };
    });
    const critical = rows.filter((r) => r.score >= 71 && r.delta < 0);
    const ticketHeavy = [...rows].sort((a, b) => b.ticket - a.ticket)[0];
    return {
      rows: [...rows].sort((a, b) => b.risk - a.risk),
      critical,
      ticketHeavy,
      lostHC: critical.reduce((a, r) => a + Math.abs(Math.min(0, r.delta)), 0),
    };
  }, [compCharts, compBase]);

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const w = window.open("", "", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<html><head><title>Report</title><style>
      body{font-family:-apple-system,sans-serif;padding:32px;color:#111}
      h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #ccc;padding:6px;text-align:left}
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (!clusters.length) return (<><AppHeader title="Reports" /><div className="p-6"><EmptyState /></div></>);

  const runningA = actions.filter((a) => a.status === "onprogress").length;
  const doneA = actions.filter((a) => a.status === "done").length;
  const belumA = actions.filter((a) => a.status === "belum").length;
  const totalA = runningA + doneA + belumA;

  const renderTab = (
    s: NonNullable<ReturnType<typeof computeStats>>,
    kind: "weekly" | "monthly",
    from: number, to: number,
    setFrom: (i: number) => void, setTo: (i: number) => void,
    ref: React.RefObject<HTMLDivElement | null>,
  ) => {
    const label = MONTHS[from].label + " → " + MONTHS[to].label + " 2026";
    const worst = s.worstRatio[0];
    const heavyPic = [...s.picPerf].sort((a, b) => b.ratio - a.ratio)[0];
    const insights = [
      `HC bergerak ${s.growth >= 0 ? "naik" : "turun"} ${Math.abs(s.growth).toFixed(1)}% pada periode ${label} (${fmtN(s.start)} → ${fmtN(s.end)}).`,
      `Cluster paling tumbuh: ${s.topGrowth[0]?.cluster ?? "-"} (${(s.topGrowth[0]?.delta ?? 0) >= 0 ? "+" : ""}${s.topGrowth[0]?.delta ?? 0}). Cluster paling turun: ${s.topDecline[0]?.cluster ?? "-"} (${s.topDecline[0]?.delta ?? 0}).`,
      `Total ${fmtN(s.totalTicket)} ticket pada periode ini (rata-rata ${fmtN(s.avgTicketPerMonth)}/bulan), puncak di ${s.peakTicket.bulan} dengan ${fmtN(s.peakTicket.ticket)} ticket.`,
      `Tren ticket ${s.ticketGrowth >= 0 ? "naik" : "turun"} ${Math.abs(s.ticketGrowth).toFixed(1)}% dari bulan awal ke bulan akhir — rasio ${s.ticketPer100HC.toFixed(1)} ticket per 100 HC.`,
      `Ticket menumpuk pada ${s.topTicket[0]?.cluster ?? "-"} (${fmtN(s.topTicket[0]?.ticket ?? 0)} tiket) dari ${fmtN(s.clustersWithTicket)} cluster yang bermasalah.`,
      worst
        ? `Rasio gangguan terburuk: ${worst.cluster} — ${worst.ticketPer100HC.toFixed(1)} ticket per 100 HC (HC ${fmtN(worst.hcEnd)}).`
        : "Rasio ticket per HC masih dalam batas wajar di seluruh cluster.",
      `PIC dengan portofolio HC terbesar: ${s.picPerf[0]?.pic ?? "-"} (${fmtN(s.picPerf[0]?.hc ?? 0)} HC, ${fmtN(s.picPerf[0]?.ticket ?? 0)} ticket).`,
      `Action plan: ${doneA} selesai · ${runningA} berjalan · ${belumA} belum — rasio delivery ${totalA ? Math.round((doneA / totalA) * 100) : 0}%.`,
    ];
    const recs = [
      s.growth < 0 ? "Aktifkan retention program di top decline cluster minggu ini." : "Jaga momentum dengan replikasi strategi top growth cluster ke cluster tetangga.",
      `Prioritaskan quick-win perbaikan layanan di ${s.topTicket[0]?.cluster ?? "cluster ticket tinggi"} untuk menurunkan ticket.`,
      worst
        ? `Audit jaringan di ${worst.cluster} — rasio ticket/HC ${worst.ticketPer100HC.toFixed(1)} per 100 HC jauh di atas normal.`
        : "Pertahankan preventive maintenance rutin untuk menjaga rasio ticket tetap rendah.",
      s.ticketGrowth > 10
        ? `Ticket naik ${s.ticketGrowth.toFixed(1)}% — siapkan penambahan tim SERPO/IKR pada bulan puncak (${s.peakTicket.bulan}).`
        : "Tren ticket terkendali — fokuskan sumber daya ke akuisisi HC baru.",
      heavyPic
        ? `Redistribusi beban PIC: ${heavyPic.pic} menangani ${heavyPic.ratio.toFixed(1)} ticket per 100 HC, tertinggi di antara PIC.`
        : `Redistribusi beban PIC: evaluasi ${s.picPerf[0]?.pic ?? "PIC top"} agar rasio HC/ticket sehat.`,
      "Deploy program loyalty & bundling di cluster potensial (HC belum mencapai target 2026).",
    ];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} avail={avail} />
          <Button size="sm" onClick={() => handlePrint(ref)}><Printer className="mr-1 h-4 w-4" /> Export PDF</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Total HC Akhir" value={s.end} hint={label} />
          <KpiCard label="Growth HC" value={`${s.growth >= 0 ? "+" : ""}${s.growth.toFixed(1)}%`} tone={s.growth >= 0 ? "up" : "down"} hint={`${fmtN(s.start)} → ${fmtN(s.end)}`} />
          <KpiCard label="Total Ticket" value={s.totalTicket} tone="warn" hint={s.hasRealTicket ? `data ticket ${label}` : `estimasi dari ${clusters.length} cluster`} />
          <KpiCard label="Tren Ticket" value={`${s.ticketGrowth >= 0 ? "+" : ""}${s.ticketGrowth.toFixed(1)}%`} tone={s.ticketGrowth <= 0 ? "up" : "down"} hint={`puncak ${s.peakTicket.bulan} (${fmtN(s.peakTicket.ticket)})`} />
          <KpiCard label="Rata-rata Ticket / Bulan" value={s.avgTicketPerMonth} hint={`${s.ticketTrend.length} bulan`} />
          <KpiCard label="Ticket per 100 HC" value={s.ticketPer100HC.toFixed(1)} tone={s.ticketPer100HC > 10 ? "down" : "up"} hint="bulan terakhir" />
          <KpiCard label="Profiling Cluster" value={s.clustersWithTicket} tone="warn" hint={`dari ${clusters.length} cluster`} />
          <KpiCard label="Action Plan Selesai" value={`${doneA}/${totalA}`} tone="up" hint={`${runningA} on progress`} />
        </div>

        <div ref={ref} className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-sm">Chart HC — {label}</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <AreaChart data={s.hcTrend}>
                  <defs><linearGradient id={`hcg-${kind}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bulan" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
                  <Tooltip formatter={(v: number) => fmtN(v)} />
                  <Area type="monotone" dataKey="hc" stroke="#6366f1" strokeWidth={2} fill={`url(#hcg-${kind})`} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-sm">Chart Ticket — {label}</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <LineChart data={s.ticketTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bulan" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ticket" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-sm">Top 8 HC per Cluster</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={s.topHC} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="cluster" fontSize={10} width={100} />
                  <Tooltip />
                  <Bar dataKey="hc" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-sm">Top 8 Ticket per Cluster</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={s.topTicket} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="cluster" fontSize={10} width={100} />
                  <Tooltip />
                  <Bar dataKey="ticket" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <ProgressCard
          title="Progress"
          items={[
            { label: "HC Growth vs periode awal", value: Math.max(0, s.end - s.start), total: Math.max(s.start, s.end, 1) },
            { label: "Action Plan Selesai", value: doneA, total: Math.max(totalA, 1) },
            { label: "Action Plan Berjalan", value: runningA, total: Math.max(totalA, 1) },
            { label: "Cluster Growth Positif", value: s.perCluster.filter((c) => c.delta > 0).length, total: s.perCluster.length },
          ]}
        />

        <Card className="glass-card border-0">
          <CardHeader><CardTitle className="font-display text-sm">Table — Ringkasan Cluster ({label})</CardTitle></CardHeader>
          <CardContent>
            <div className="scroll-x">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2 text-left">Cluster</th><th className="p-2 text-left">PIC</th><th className="p-2 text-right">HC Awal</th><th className="p-2 text-right">HC Akhir</th><th className="p-2 text-right">Δ</th><th className="p-2 text-right">Ticket</th><th className="p-2 text-left">Status</th></tr>
                </thead>
                <tbody>
                  {[...s.perCluster].sort((a, b) => b.hcEnd - a.hcEnd).slice(0, 12).map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 font-medium">{c.cluster}</td>
                      <td className="p-2 text-muted-foreground">{c.pic || "-"}</td>
                      <td className="p-2 text-right">{fmtN(c.hcStart)}</td>
                      <td className="p-2 text-right font-semibold">{fmtN(c.hcEnd)}</td>
                      <td className={`p-2 text-right ${c.delta >= 0 ? "text-success" : "text-destructive"}`}>{c.delta >= 0 ? "+" : ""}{c.delta}</td>
                      <td className="p-2 text-right">{c.ticket}</td>
                      <td className="p-2"><Badge variant={c.delta < 0 ? "destructive" : c.delta === 0 ? "secondary" : "default"}>{c.delta < 0 ? "Decline" : c.delta === 0 ? "Flat" : "Growth"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <InsightBox items={insights} />
          <RecommendationBox items={recs} />
        </div>
      </div>
    );
  };

  return (
    <>
      <AppHeader title="Reports" subtitle="Weekly · Day · Monthly · Competitor Intelligence" />
      <div className="space-y-4 p-4 sm:p-6">
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly"><CalendarIcon className="mr-1 h-4 w-4" /> Weekly</TabsTrigger>
            <TabsTrigger value="day"><CalendarIcon className="mr-1 h-4 w-4" /> Day</TabsTrigger>
            <TabsTrigger value="monthly"><FileText className="mr-1 h-4 w-4" /> Monthly</TabsTrigger>
            <TabsTrigger value="intel"><RadarIcon className="mr-1 h-4 w-4" /> Competitor Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            {weekly && renderTab(weekly, "weekly", wFrom, wTo, setWFrom, setWTo, weeklyRef)}
          </TabsContent>

          <TabsContent value="day" className="space-y-4">
            {analyst.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 text-primary" />
                  Belum ada data profiling. Upload ANALYST MARKET.xlsx dari Settings → Data Management.
                </CardContent>
              </Card>
            ) : (
              <>
                <WeeklyDailyAnalysis analyst={analyst} from={wDFrom} to={wDTo} onFrom={setWDFrom} onTo={setWDTo} />
                <ProfilingSummary analyst={analyst} dFrom={wDFrom} dTo={wDTo} />
              </>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            {monthly && renderTab(monthly, "monthly", mFrom, mTo, setMFrom, setMTo, monthlyRef)}
          </TabsContent>

          <TabsContent value="intel" className="space-y-4">
            {!compCharts || !compBase ? (
              <Card className="glass-card border-0">
                <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                  <RadarIcon className="h-8 w-8 text-primary" />
                  Belum ada data Competitor. Upload KOMPETITOR.xlsx dari Settings → Data Management.
                </CardContent>
              </Card>
            ) : (
              <>
                <DateRange from={cFrom} to={cTo} onFrom={setCFrom} onTo={setCTo} avail={avail} />

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KpiCard label="Cluster Terpantau" value={compCharts.totalClusters} />
                  <KpiCard label="Kompetitor Unik" value={compCharts.totalCompetitors} />
                  <KpiCard label="Ancaman Tinggi" value={compCharts.highThreat} tone="down" hint="threat ≥ 71" />
                  <KpiCard label="Avg Harga Kompetitor" value={fmtRp(compCharts.avgPriceAll)} tone="warn" />
                  <KpiCard label="Cluster Kritis" value={compRisk?.critical.length ?? 0} tone="down" hint="ancaman tinggi + HC turun" />
                  <KpiCard label="HC Hilang di Cluster Kritis" value={compRisk?.lostHC ?? 0} tone="down" hint={`${MONTHS[cFrom].label} → ${MONTHS[cTo].label}`} />
                  <KpiCard label="Ticket di Area Kompetitif" value={compBase.totalTicket} tone="warn" hint={`rata-rata ${fmtN(compBase.avgTicketPerMonth)}/bulan`} />
                  <KpiCard label="Growth HC Pasar" value={`${compBase.growth >= 0 ? "+" : ""}${compBase.growth.toFixed(1)}%`} tone={compBase.growth >= 0 ? "up" : "down"} hint={`${fmtN(compBase.start)} → ${fmtN(compBase.end)}`} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Chart HC (kontek pasar) — {MONTHS[cFrom].label} → {MONTHS[cTo].label}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer>
                        <AreaChart data={compBase.hcTrend}>
                          <defs><linearGradient id="hcg-intel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="bulan" fontSize={11} />
                          <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
                          <Tooltip formatter={(v: number) => fmtN(v)} />
                          <Area type="monotone" dataKey="hc" stroke="#22c55e" strokeWidth={2} fill="url(#hcg-intel)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Chart Ticket (kontek pasar)</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer>
                        <LineChart data={compBase.ticketTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="bulan" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="ticket" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Top Competitor</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <BarChart data={compCharts.topCompetitors} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" fontSize={11} />
                          <YAxis type="category" dataKey="name" fontSize={11} width={90} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {compCharts.topCompetitors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Threat Level Distribution</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={compCharts.threatBuckets} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name}: ${e.value}`} labelLine={false}>
                            {compCharts.threatBuckets.map((_, i) => <Cell key={i} fill={["#22c55e", "#f59e0b", "#ef4444"][i]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <ProgressCard
                  title="Progress Intelligence"
                  items={[
                    { label: "Cluster Ancaman Tinggi", value: compCharts.highThreat, total: Math.max(compCharts.totalClusters, 1) },
                    { label: "Cluster Ancaman Sedang", value: compCharts.threatBuckets[1].value, total: Math.max(compCharts.totalClusters, 1) },
                    { label: "Cluster Ancaman Rendah", value: compCharts.threatBuckets[0].value, total: Math.max(compCharts.totalClusters, 1) },
                    { label: "Kompetitor dengan Promo Aktif", value: compCharts.promoBreakdown.filter((p) => p.name !== "Tidak Ada Promo").reduce((a, b) => a + b.value, 0), total: competitorData.length },
                  ]}
                />

                <Card className="glass-card border-0">
                  <CardHeader><CardTitle className="font-display text-sm">Table — Top Threat Cluster</CardTitle></CardHeader>
                  <CardContent>
                    <div className="scroll-x">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                          <tr><th className="p-2 text-left">Cluster</th><th className="p-2 text-right">Kompetitor</th><th className="p-2 text-right">Avg Harga</th><th className="p-2 text-right">Threat Score</th><th className="p-2 text-left">Level</th></tr>
                        </thead>
                        <tbody>
                          {compCharts.topThreats.map((t) => (
                            <tr key={t.cluster} className="border-t">
                              <td className="p-2 font-medium">{t.cluster}</td>
                              <td className="p-2 text-right">{t.competitors}</td>
                              <td className="p-2 text-right">{fmtRp(Math.round(t.avgPrice))}</td>
                              <td className="p-2 text-right font-semibold">{t.score}</td>
                              <td className="p-2"><Badge variant={t.score >= 71 ? "destructive" : t.score >= 41 ? "secondary" : "default"}>{t.score >= 71 ? "Tinggi" : t.score >= 41 ? "Sedang" : "Rendah"}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <InsightBox items={[
                    `${compCharts.totalCompetitors} kompetitor unik terdeteksi di ${compCharts.totalClusters} cluster.`,
                    `Kompetitor dominan: ${compCharts.dominant} — muncul di ${compCharts.topCompetitors[0]?.value ?? 0} lokasi.`,
                    `${compCharts.highThreat} cluster masuk kategori ancaman TINGGI (threat ≥ 71).`,
                    `Harga rata-rata kompetitor Rp${compCharts.avgPriceAll.toLocaleString("id-ID")} — ${compCharts.avgPriceAll < 200000 ? "tekanan harga tinggi" : "masih dalam batas wajar"}.`,
                    `Promo teraktif: ${[...compCharts.promoBreakdown].sort((a, b) => b.value - a.value)[0]?.name ?? "-"}.`,
                    compRisk?.critical.length
                      ? `${compRisk.critical.length} cluster kritis (ancaman tinggi + HC turun) kehilangan ${fmtN(compRisk.lostHC)} HC pada ${MONTHS[cFrom].label} → ${MONTHS[cTo].label}.`
                      : "Belum ada cluster ancaman tinggi yang sekaligus kehilangan HC — posisi pasar masih aman.",
                    compRisk?.ticketHeavy
                      ? `Gangguan terbanyak di area kompetitif: ${compRisk.ticketHeavy.cluster} (${fmtN(compRisk.ticketHeavy.ticket)} ticket, threat ${compRisk.ticketHeavy.score}) — risiko churn ke kompetitor.`
                      : `Total ${fmtN(compBase.totalTicket)} ticket tercatat di periode yang sama.`,
                    `Risiko tertinggi gabungan: ${compRisk?.rows[0]?.cluster ?? "-"} (skor risiko ${compRisk?.rows[0]?.risk ?? 0}).`,
                  ]} />
                  <RecommendationBox items={[
                    `Prioritas defense di ${compRisk?.rows[0]?.cluster ?? compCharts.topThreats[0]?.cluster ?? "cluster ancaman tinggi"} — deploy retention bundle.`,
                    "Counter promo kompetitor dengan penawaran serupa (gratis instalasi / cashback) selama 30 hari.",
                    "Naikkan value proposition (bundling speed & konten) di cluster dengan harga kompetitor < Rp200K.",
                    compRisk?.ticketHeavy
                      ? `Perbaiki kualitas jaringan di ${compRisk.ticketHeavy.cluster} sebelum kompetitor memanfaatkan keluhan pelanggan.`
                      : "Jaga kualitas jaringan agar tidak memberi celah bagi kompetitor.",
                    `Site visit mingguan ke ${compCharts.dominant}-heavy cluster untuk profiling lanjutan.`,
                    "Update pricing playbook bulanan berbasis data harga kompetitor terbaru.",
                  ]} />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
