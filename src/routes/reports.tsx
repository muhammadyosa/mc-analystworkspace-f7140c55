import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { Printer, FileText, Calendar } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — MCA Workspace" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const clusters = useDataStore((s) => s.clusters);
  const actions = useDataStore((s) => s.actions);
  const weeklyRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!clusters.length) return null;
    const sumJun = clusters.reduce((a, c) => a + c.juni, 0);
    const sumMei = clusters.reduce((a, c) => a + c.mei, 0);
    const growth = sumMei > 0 ? ((sumJun - sumMei) / sumMei) * 100 : 0;
    const topGrowth = [...clusters].sort((a, b) => b.deltaMeiJuni - a.deltaMeiJuni).slice(0, 5);
    const topDecline = [...clusters].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 5);
    const totalTicket = clusters.reduce((a, c) => a + c.ticket, 0);
    const running = actions.filter((a) => a.status === "onprogress").length;
    return { sumJun, sumMei, growth, topGrowth, topDecline, totalTicket, running };
  }, [clusters, actions]);

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const w = window.open("", "", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<html><head><title>Report</title><style>
      body{font-family:-apple-system,sans-serif;padding:32px;color:#111}
      h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
      ul{margin:0;padding-left:20px} li{margin:4px 0} .kpi{display:inline-block;margin-right:24px}
      .label{font-size:11px;color:#666;text-transform:uppercase} .value{font-size:20px;font-weight:700}
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (!clusters.length) return (<><AppHeader title="Reports" /><div className="p-6"><EmptyState /></div></>);
  const s = stats!;

  return (
    <>
      <AppHeader title="Reports" subtitle="Weekly & Monthly report generator" />
      <div className="space-y-4 p-4 sm:p-6">
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly"><Calendar className="mr-1 h-4 w-4" /> Weekly</TabsTrigger>
            <TabsTrigger value="monthly"><FileText className="mr-1 h-4 w-4" /> Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-base">Weekly Report</CardTitle>
                <Button size="sm" onClick={() => handlePrint(weeklyRef)}><Printer className="mr-1 h-4 w-4" /> Export PDF</Button>
              </CardHeader>
              <CardContent>
                <div ref={weeklyRef} className="space-y-4 text-sm">
                  <div>
                    <h1 className="font-display text-xl font-bold">Weekly Executive Report</h1>
                    <p className="text-muted-foreground">Periode: minggu berjalan</p>
                  </div>
                  <div>
                    <div className="kpi inline-block mr-6"><div className="label text-[10px] uppercase text-muted-foreground">Total HC</div><div className="value font-display text-lg font-bold">{s.sumJun.toLocaleString("id-ID")}</div></div>
                    <div className="kpi inline-block mr-6"><div className="label text-[10px] uppercase text-muted-foreground">Growth</div><div className="value font-display text-lg font-bold">{s.growth.toFixed(1)}%</div></div>
                    <div className="kpi inline-block"><div className="label text-[10px] uppercase text-muted-foreground">Ticket</div><div className="value font-display text-lg font-bold">{s.totalTicket}</div></div>
                  </div>
                  <div><h2 className="font-semibold">Executive Summary</h2><p>HC {s.growth >= 0 ? "tumbuh" : "turun"} {s.growth.toFixed(1)}% dari periode sebelumnya. {s.running} action plan sedang berjalan.</p></div>
                  <div><h2 className="font-semibold">Top Growth Cluster</h2><ul>{s.topGrowth.map((c) => <li key={c.id}>{c.cluster} (+{c.deltaMeiJuni})</li>)}</ul></div>
                  <div><h2 className="font-semibold">Top Decline Cluster</h2><ul>{s.topDecline.map((c) => <li key={c.id}>{c.cluster} ({c.deltaMeiJuni})</li>)}</ul></div>
                  <div><h2 className="font-semibold">Program Berjalan</h2><ul>{actions.filter((a) => a.status === "onprogress").map((a) => <li key={a.id}>{a.cluster} — {a.program}</li>)}{!actions.filter((a) => a.status === "onprogress").length && <li>Tidak ada</li>}</ul></div>
                  <div><h2 className="font-semibold">Rencana Minggu Depan</h2><ul><li>Retention Program di cluster decline</li><li>Site Visit ke high-risk cluster</li><li>Analisa kompetitor</li></ul></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-base">Monthly Report</CardTitle>
                <Button size="sm" onClick={() => handlePrint(monthlyRef)}><Printer className="mr-1 h-4 w-4" /> Export PDF</Button>
              </CardHeader>
              <CardContent>
                <div ref={monthlyRef} className="space-y-4 text-sm">
                  <div>
                    <h1 className="font-display text-xl font-bold">Monthly Executive Report</h1>
                    <p className="text-muted-foreground">Periode: Juni 2026</p>
                  </div>
                  <div><h2 className="font-semibold">HC Summary</h2><p>Total HC bulan ini: {s.sumJun.toLocaleString("id-ID")} (bulan lalu {s.sumMei.toLocaleString("id-ID")}).</p></div>
                  <div><h2 className="font-semibold">Growth Summary</h2><p>Pertumbuhan {s.growth.toFixed(1)}%. Top cluster: {s.topGrowth[0]?.cluster ?? "—"}.</p></div>
                  <div><h2 className="font-semibold">Ticket Summary</h2><p>Total ticket: {s.totalTicket}. Kluster dengan ticket tertinggi memerlukan retention.</p></div>
                  <div><h2 className="font-semibold">Program Effectiveness</h2><p>{actions.filter((a) => a.status === "done").length} program selesai. {s.running} sedang berjalan.</p></div>
                  <div><h2 className="font-semibold">Insight Bulanan</h2><ul><li>Prioritaskan retention pada cluster decline</li><li>Perluas coverage di area low-HC dengan potensi tinggi</li></ul></div>
                  <div><h2 className="font-semibold">Prioritas Bulan Depan</h2><ul><li>Eksekusi acquisition strategy</li><li>Optimalisasi PIC performance</li><li>Deploy loyalty program</li></ul></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
