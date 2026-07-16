import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ChevronRight, ArrowUpDown } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataStore, computePriority } from "@/lib/store";
import { exportToExcel } from "@/lib/excel";

export const Route = createFileRoute("/master")({
  head: () => ({ meta: [{ title: "Master Cluster — MCA Workspace" }] }),
  component: MasterPage,
});

type SortKey = "cluster" | "hc" | "ticket" | "growth";

function MasterPage() {
  const clusters = useDataStore((s) => s.clusters);
  const [q, setQ] = useState("");
  const [prov, setProv] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("hc");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const provinces = useMemo(() => [...new Set(clusters.map((c) => c.provinsi).filter(Boolean))].sort(), [clusters]);
  const maxTicket = useMemo(() => Math.max(...clusters.map((c) => c.ticket), 1), [clusters]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    let arr = clusters.filter((c) => {
      const matchQ =
        !ql ||
        c.cluster.toLowerCase().includes(ql) ||
        c.kabupaten.toLowerCase().includes(ql) ||
        c.pic.toLowerCase().includes(ql);
      const matchP = prov === "all" || c.provinsi === prov;
      return matchQ && matchP;
    });
    arr = arr.sort((a, b) => {
      const av = sort === "cluster" ? a.cluster : sort === "hc" ? a.juni : sort === "ticket" ? a.ticket : a.deltaMeiJuni;
      const bv = sort === "cluster" ? b.cluster : sort === "hc" ? b.juni : sort === "ticket" ? b.ticket : b.deltaMeiJuni;
      if (typeof av === "string" && typeof bv === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [clusters, q, prov, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("desc");
    }
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((c) => ({
        Cluster: c.cluster,
        Kabupaten: c.kabupaten,
        Provinsi: c.provinsi,
        PIC: c.pic,
        HC_Juni: c.juni,
        Ticket: c.ticket,
        Delta_HC: c.deltaMeiJuni,
        SERPO: c.serpoStatus,
        IKR: c.ikrStatus,
      })),
      "master-cluster.xlsx",
    );
  };

  if (!clusters.length)
    return (
      <>
        <AppHeader title="Master Cluster" />
        <div className="p-6"><EmptyState /></div>
      </>
    );

  return (
    <>
      <AppHeader title="Master Cluster" subtitle={`${clusters.length} cluster tersedia`} />
      <div className="space-y-4 p-4 sm:p-6">
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
            <Select value={prov} onValueChange={(v) => { setProv(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
        </Card>

        <Card className="glass-card overflow-hidden border-0">
          <div className="scroll-x">
          <Table className="min-w-[960px]">

            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("cluster")}>
                    Cluster <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Kabupaten</TableHead>
                <TableHead>Provinsi</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right">
                  <button className="ml-auto flex items-center gap-1 font-semibold" onClick={() => toggleSort("hc")}>
                    HC <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button className="ml-auto flex items-center gap-1 font-semibold" onClick={() => toggleSort("ticket")}>
                    Ticket <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button className="ml-auto flex items-center gap-1 font-semibold" onClick={() => toggleSort("growth")}>
                    Δ HC <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SERPO</TableHead>
                <TableHead>IKR</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => {
                const pr = computePriority(c, maxTicket);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.cluster}</TableCell>
                    <TableCell className="text-muted-foreground">{c.kabupaten}</TableCell>
                    <TableCell className="text-muted-foreground">{c.provinsi}</TableCell>
                    <TableCell className="text-muted-foreground">{c.pic || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.juni.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.ticket}</TableCell>
                    <TableCell className={`text-right tabular-nums ${c.deltaMeiJuni >= 0 ? "text-success" : "text-destructive"}`}>
                      {c.deltaMeiJuni >= 0 ? "+" : ""}
                      {c.deltaMeiJuni}
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
                    <TableCell className="text-xs text-muted-foreground">{c.serpoStatus || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.ikrStatus || "—"}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link to="/cluster/$name" params={{ name: encodeURIComponent(c.cluster) }}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
            <div>
              {filtered.length} hasil · Halaman {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
