import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ChevronRight, ArrowUpDown, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  churnPotential,
  hcTrend,
  trendLabel,
  retentionAdvice,
  profilingText,
} from "@/lib/cluster-profiling";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computePriority } from "@/lib/store";
import { exportToExcel } from "@/lib/excel";
import { useGlobalClusters } from "@/hooks/use-global-filters";
import { GlobalFilterBar } from "@/components/global-filter";
import { usePrefsStore } from "@/lib/prefs";
import { useClusterActions } from "@/hooks/use-cluster-actions";
import { ClusterActionSummary } from "@/components/cluster-action-summary";
import { actionSummaryText } from "@/lib/action-plan-summary";

export const Route = createFileRoute("/master")({
  head: () => ({
    meta: [
      { title: "Master Cluster — MCA Analyst Workspace" },
      {
        name: "description",
        content: "Telusuri data cluster, HC bulanan, ticket, dan prioritas wilayah.",
      },
      { property: "og:title", content: "Master Cluster — MCA Analyst Workspace" },
      {
        property: "og:description",
        content: "Telusuri data cluster, HC bulanan, ticket, dan prioritas wilayah.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MasterPage,
});

type SortKey =
  | "cluster"
  | "hc"
  | "ticket"
  | "growth"
  | "churn"
  | "priority"
  | "decline"
  | "kabupaten"
  | "pic";
const SORT_LABELS: Record<SortKey, string> = {
  churn: "Potensi Churn Tertinggi",
  priority: "Priority Score",
  decline: "Penurunan HC",
  ticket: "Jumlah Ticket",
  kabupaten: "Kabupaten",
  pic: "PIC",
  cluster: "Nama Cluster",
  hc: "HC Aktif",
  growth: "Δ HC Aktif",
};
const levelCls = (l: string) =>
  l === "Tinggi"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : l === "Sedang"
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-success/40 bg-success/10 text-success";

const MONTHS = [
  { key: "januari", label: "Januari" },
  { key: "februari", label: "Februari" },
  { key: "maret", label: "Maret" },
  { key: "april", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Juni" },
  { key: "juli", label: "Juli" },
  { key: "agustus", label: "Agustus" },
  { key: "september", label: "September" },
  { key: "oktober", label: "Oktober" },
  { key: "november", label: "November" },
  { key: "desember", label: "Desember" },
] as const;
type MonthKey = (typeof MONTHS)[number]["key"];

const hcOf = (c: Record<string, unknown>, k: MonthKey) => Number(c[k]) || 0;
const ticketOf = (
  c: { ticketByMonth?: Record<string, number>; ticket: number },
  k: MonthKey | "all",
) => (k === "all" ? c.ticket : Number(c.ticketByMonth?.[k] ?? 0));

function MasterPage() {
  const { rows: clusters } = useGlobalClusters();
  const density = usePrefsStore((s) => s.density);
  const [q, setQ] = useState("");
  const [prov, setProv] = useState<string>("all");
  const [month, setMonth] = useState<MonthKey | "all">("all");
  const [sort, setSort] = useState<SortKey>("hc");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [risk, setRisk] = useState<"all" | "Tinggi" | "Sedang" | "Rendah">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailCluster = clusters.find((c) => c.id === detailId)?.cluster ?? "";
  const actionSummary = useClusterActions(detailCluster);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const provinces = useMemo(
    () => [...new Set(clusters.map((c) => c.provinsi).filter(Boolean))].sort(),
    [clusters],
  );

  const availableMonths = useMemo(
    () =>
      MONTHS.filter((m) =>
        clusters.some(
          (c) =>
            hcOf(c as unknown as Record<string, unknown>, m.key) > 0 ||
            (c.ticketByMonth?.[m.key] ?? 0) > 0,
        ),
      ),
    [clusters],
  );

  // Nilai per baris sesuai bulan terpilih ("all" = ringkasan terakhir/total)
  const rows = useMemo(() => {
    const idx = month === "all" ? -1 : MONTHS.findIndex((m) => m.key === month);
    return clusters.map((c) => {
      if (month === "all")
        return { ...c, hcView: c.juni, ticketView: c.ticket, deltaView: c.deltaMeiJuni };
      const rec = c as unknown as Record<string, unknown>;
      const cur = hcOf(rec, month);
      const prevKey = idx > 0 ? MONTHS[idx - 1].key : null;
      const prev = prevKey ? hcOf(rec, prevKey) : 0;
      return {
        ...c,
        hcView: cur,
        ticketView: ticketOf(c, month),
        deltaView: prevKey ? cur - prev : 0,
      };
    });
  }, [clusters, month]);

  const maxTicket = useMemo(() => Math.max(...rows.map((c) => c.ticketView), 1), [rows]);

  const scored = useMemo(
    () =>
      rows.map((c) => {
        const pr = computePriority(
          { ...c, juni: c.hcView, ticket: c.ticketView, deltaMeiJuni: c.deltaView },
          maxTicket,
        );
        const ch = churnPotential(
          { hc: c.hcView, delta: c.deltaView, churn: c.churn || 0, ticket: c.ticketView },
          maxTicket,
        );
        return { ...c, pr, ch };
      }),
    [rows, maxTicket],
  );

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const arr = scored.filter((c) => {
      const matchQ =
        !ql ||
        c.cluster.toLowerCase().includes(ql) ||
        (c.kabupaten || "").toLowerCase().includes(ql) ||
        (c.pic || "").toLowerCase().includes(ql);
      const matchP = prov === "all" || c.provinsi === prov;
      const matchR = risk === "all" || c.ch.level === risk;
      return matchQ && matchP && matchR;
    });
    const val = (c: (typeof arr)[number]): string | number => {
      switch (sort) {
        case "cluster":
          return c.cluster;
        case "kabupaten":
          return c.kabupaten || "";
        case "pic":
          return c.pic || "";
        case "hc":
          return c.hcView;
        case "ticket":
          return c.ticketView;
        case "growth":
          return c.deltaView;
        case "decline":
          return -c.deltaView;
        case "priority":
          return c.pr.score;
        case "churn":
          return c.ch.score;
      }
    };
    return [...arr].sort((a, b) => {
      const av = val(a),
        bv = val(b);
      if (typeof av === "string" && typeof bv === "string")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [scored, q, prov, risk, sort, dir]);

  const riskCounts = useMemo(() => {
    const r = { Tinggi: 0, Sedang: 0, Rendah: 0 };
    scored.forEach((c) => r[c.ch.level]++);
    return r;
  }, [scored]);

  const detail = useMemo(() => {
    const c = scored.find((x) => x.id === detailId);
    if (!c) return null;
    const series = hcTrend(c);
    const trend = trendLabel(series);
    const advice = [...new Set([...retentionAdvice(c.ch.level, c), ...actionSummary.advice])];
    const period =
      month === "all" ? "Bulan terbaru" : (MONTHS.find((m) => m.key === month)?.label ?? "");
    const text =
      profilingText({
        cluster: c.cluster,
        kabupaten: c.kabupaten,
        provinsi: c.provinsi,
        pic: c.pic,
        period,
        hc: c.hcView,
        delta: c.deltaView,
        ticket: c.ticketView,
        trend,
        priority: c.pr,
        churn: c.ch,
        advice,
      }) +
      "\n\nACTION PLAN — KANBAN\n" +
      actionSummaryText(actionSummary);
    return { c, series, trend, advice, text, rank: filtered.findIndex((x) => x.id === c.id) + 1 };
  }, [scored, detailId, month, filtered, actionSummary]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Hasil profiling disalin");
    } catch {
      toast.error("Gagal menyalin — izinkan akses clipboard");
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("desc");
    }
  };

  const monthLabel =
    month === "all" ? "Semua Bulan" : (MONTHS.find((m) => m.key === month)?.label ?? "");

  const handleExport = () => {
    exportToExcel(
      filtered.map((c) => ({
        Cluster: c.cluster,
        Kabupaten: c.kabupaten,
        Provinsi: c.provinsi,
        PIC: c.pic,
        Bulan: monthLabel,
        Homepass: c.homepass,
        HC_Terpasang: c.hcTerpasang,
        [`HC_Aktif_${monthLabel}`]: c.hcView,
        Available: c.available,
        Churn: c.churn,
        Ticket: c.ticketView,
        Delta_HC_Aktif: c.deltaView,
        SERPO: c.serpoStatus,
        IKR: c.ikrStatus,
      })),
      `master-cluster-${monthLabel.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
    );
  };

  if (!clusters.length)
    return (
      <>
        <AppHeader title="Master Cluster" />
        <div className="p-6">
          <EmptyState />
        </div>
      </>
    );

  return (
    <>
      <AppHeader title="Master Cluster" subtitle={`${clusters.length} cluster · ${monthLabel}`} />
      <div className="space-y-4 p-4 sm:p-6">
        <GlobalFilterBar />
        <Card className="glass-card border-0 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative w-full sm:min-w-[220px] sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari cluster, kabupaten, PIC…"
                className="pl-9"
              />
            </div>
            <Select
              value={month}
              onValueChange={(v) => {
                setMonth(v as MonthKey | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={prov}
              onValueChange={(v) => {
                setProv(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as SortKey);
                setDir(["cluster", "kabupaten", "pic"].includes(v) ? "asc" : "desc");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SORT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Balik urutan"
              onClick={() => setDir(dir === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Potensi churn:</span>
            {(["all", "Tinggi", "Sedang", "Rendah"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={risk === r ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  setRisk(r);
                  setPage(1);
                }}
              >
                {r === "all" ? `Semua (${scored.length})` : `${r} (${riskCounts[r]})`}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="glass-card overflow-hidden border-0">
          {/* Mobile: setiap baris menjadi kartu agar tidak melebar */}
          <div className="space-y-2 p-3 md:hidden">
            {paginated.map((c) => {
              const pr = c.pr;
              return (
                <div key={c.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.cluster}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.kabupaten} · {c.provinsi}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        pr.level === "Tinggi"
                          ? "border-destructive/40 bg-destructive/10 text-[10px] text-destructive"
                          : pr.level === "Sedang"
                            ? "border-warning/40 bg-warning/10 text-[10px] text-warning"
                            : "border-success/40 bg-success/10 text-[10px] text-success"
                      }
                    >
                      {pr.level}
                    </Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      HC Aktif:{" "}
                      <b className="text-foreground tabular-nums">
                        {c.hcView.toLocaleString("id-ID")}
                      </b>
                    </div>
                    <div>
                      Ticket:{" "}
                      <b className="text-foreground tabular-nums">
                        {c.ticketView.toLocaleString("id-ID")}
                      </b>
                    </div>
                    <div>
                      Δ HC Aktif:{" "}
                      <b className={c.deltaView >= 0 ? "text-success" : "text-destructive"}>
                        {c.deltaView >= 0 ? "+" : ""}
                        {c.deltaView}
                      </b>
                    </div>
                    <div>
                      PIC: <b className="text-foreground">{c.pic || "—"}</b>
                    </div>
                    <div>
                      Priority: <b className="text-foreground tabular-nums">{pr.score}</b>
                    </div>
                    <div>
                      Churn:{" "}
                      <b className="text-foreground tabular-nums">
                        {c.ch.score} · {c.ch.level}
                      </b>
                    </div>
                  </dl>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 flex-1"
                      onClick={() => setDetailId(c.id)}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      Lihat Detail
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-9">
                      <Link to="/cluster/$name" params={{ name: encodeURIComponent(c.cluster) }}>
                        Buka <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="scroll-x hidden md:block">
            <Table
              className={density === "compact" ? "min-w-[1180px] [&_td]:py-1.5" : "min-w-[1180px]"}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("cluster")}
                    >
                      Cluster <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Kabupaten</TableHead>
                  <TableHead>Provinsi</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead className="text-right">Homepass</TableHead>
                  <TableHead className="text-right">HC Terpasang</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("hc")}
                    >
                      HC Aktif {month === "all" ? "" : monthLabel}{" "}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Churn</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("ticket")}
                    >
                      Ticket <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("growth")}
                    >
                      Δ HC Aktif <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("priority")}
                    >
                      Priority <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort("churn")}
                    >
                      Potensi Churn <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>SERPO</TableHead>
                  <TableHead>IKR</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => {
                  const pr = c.pr;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.cluster}</TableCell>
                      <TableCell className="text-muted-foreground">{c.kabupaten}</TableCell>
                      <TableCell className="text-muted-foreground">{c.provinsi}</TableCell>
                      <TableCell className="text-muted-foreground">{c.pic || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.homepass || 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.hcTerpasang || 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.hcView.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.available || 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.churn || 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.ticketView.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${c.deltaView >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {c.deltaView >= 0 ? "+" : ""}
                        {c.deltaView}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            pr.level === "Tinggi"
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : pr.level === "Sedang"
                                ? "border-warning/40 bg-warning/10 text-warning"
                                : "border-success/40 bg-success/10 text-success"
                          }
                        >
                          {pr.level} ({pr.score})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={levelCls(c.ch.level)}>
                          {c.ch.level} ({c.ch.score})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.serpoStatus || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.ikrStatus || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Lihat detail profiling"
                          onClick={() => setDetailId(c.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            to="/cluster/$name"
                            params={{ name: encodeURIComponent(c.cluster) }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {filtered.length} hasil · Halaman {page} / {totalPages}
            </div>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        <Dialog
          open={!!detail}
          onOpenChange={(o) => {
            if (!o) setDetailId(null);
          }}
        >
          <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
            {detail && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display pr-6">
                    Hasil Profiling — {detail.c.cluster}
                  </DialogTitle>
                  <DialogDescription>
                    {detail.c.kabupaten} · {detail.c.provinsi} · PIC {detail.c.pic || "—"}
                    {detail.rank > 0 ? ` · Peringkat #${detail.rank} (${SORT_LABELS[sort]})` : ""}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Tren HC", detail.trend],
                    ["HC Aktif", detail.c.hcView.toLocaleString("id-ID")],
                    [
                      "Perubahan HC",
                      `${detail.c.deltaView >= 0 ? "+" : ""}${detail.c.deltaView.toLocaleString("id-ID")}`,
                    ],
                    ["Jumlah Ticket", detail.c.ticketView.toLocaleString("id-ID")],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-[11px] text-muted-foreground">{k}</p>
                      <p className="font-semibold tabular-nums">{v}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Priority Score</p>
                    <Badge variant="outline" className={levelCls(detail.c.pr.level)}>
                      {detail.c.pr.score} · {detail.c.pr.level}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Potensi Churn</p>
                    <Badge variant="outline" className={levelCls(detail.c.ch.level)}>
                      {detail.c.ch.score} · {detail.c.ch.level}
                    </Badge>
                  </div>
                </div>
                {detail.series.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {detail.series.slice(-6).map((m) => (
                      <span key={m.key} className="rounded-md bg-muted/40 px-2 py-1">
                        {m.label.slice(0, 3)}:{" "}
                        <b className="text-foreground tabular-nums">
                          {m.hc.toLocaleString("id-ID")}
                        </b>
                      </span>
                    ))}
                  </div>
                )}
                <ClusterActionSummary summary={actionSummary} />
                <div>
                  <p className="mb-1 text-xs font-semibold">Rekomendasi Retention</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {detail.advice.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={() => copyText(detail.text)}>
                    <Copy className="mr-1 h-4 w-4" />
                    Salin Hasil Profiling
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link
                      to="/cluster/$name"
                      params={{ name: encodeURIComponent(detail.c.cluster) }}
                    >
                      Buka Halaman Cluster
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
