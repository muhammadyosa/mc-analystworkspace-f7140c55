import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
];

const tt = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 };

type Stats = {
  topCompetitors: { name: string; count: number; avgPrice: number }[];
  potensi: { tinggi: number; sedang: number; rendah: number };
  promos: { name: string; value: number }[];
  segments: { name: string; value: number }[];
  strategies: { name: string; value: number }[];
  dayaBeli: { name: string; value: number }[];
};

type ChartClick = { activePayload?: Array<{ payload: Record<string, unknown> }> };

export default function AnalystCharts({
  stats: s,
  onSelect,
}: {
  stats: Stats;
  onSelect?: (kind: "competitor" | "potensi" | "promo" | "segment" | "strategy" | "dayaBeli", data: Record<string, unknown>) => void;
}) {
  const handleBar = (kind: Parameters<NonNullable<typeof onSelect>>[0]) => (p: ChartClick) => {
    const d = p?.activePayload?.[0]?.payload;
    if (d && onSelect) onSelect(kind, d);
  };
  const handlePie = (kind: Parameters<NonNullable<typeof onSelect>>[0]) => (d: Record<string, unknown>) => {
    if (d && onSelect) onSelect(kind, d);
  };
  const cursor = onSelect ? { style: { cursor: "pointer" } } : {};
  const potensiData = [
    { name: "Tinggi", value: s.potensi.tinggi },
    { name: "Sedang", value: s.potensi.sedang },
    { name: "Rendah", value: s.potensi.rendah },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Top 10 Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.topCompetitors} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={11} width={100} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tt} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Potensi Cluster</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={potensiData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4} isAnimationActive={false}>
                {potensiData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Harga Rata-rata Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.topCompetitors.filter((c) => c.avgPrice > 0)}>
              <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" height={60} />
              <YAxis fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `Rp${v.toLocaleString("id-ID")}`} contentStyle={tt} />
              <Bar dataKey="avgPrice" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Promo Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={s.promos} dataKey="value" nameKey="name" outerRadius={110} isAnimationActive={false}>
                {s.promos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Strategi Marketing</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.strategies} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={11} width={110} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Segmen Pelanggan & Daya Beli</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={s.segments} dataKey="value" nameKey="name" cx="30%" outerRadius={90} label={{ fontSize: 10 }} isAnimationActive={false}>
                {s.segments.map((_, i) => <Cell key={`seg-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Pie data={s.dayaBeli} dataKey="value" nameKey="name" cx="75%" innerRadius={50} outerRadius={90} label={{ fontSize: 10 }} isAnimationActive={false}>
                {s.dayaBeli.map((_, i) => <Cell key={`db-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
