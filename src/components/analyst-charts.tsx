import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Explicit hex palette — CSS tokens are oklch(), so hsl(var(--x)) would render invalid colors.
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];
const POTENSI_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

const tt = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
};
const axis = { fontSize: 11, fill: "var(--color-muted-foreground)" };

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
  const legend = <Legend wrapperStyle={{ fontSize: 11 }} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Top 10 Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.topCompetitors} layout="vertical" margin={{ left: 20 }} onClick={handleBar("competitor")} {...cursor}>
              <XAxis type="number" tick={axis} />
              <YAxis type="category" dataKey="name" tick={axis} width={100} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tt} />
              <Bar dataKey="count" name="Jumlah" fill="#6366f1" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Potensi Cluster</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={potensiData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4} isAnimationActive={false} onClick={handlePie("potensi")} label={{ fontSize: 11 }} {...cursor}>
                {potensiData.map((_, i) => <Cell key={i} fill={POTENSI_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
              {legend}
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Harga Rata-rata Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.topCompetitors.filter((c) => c.avgPrice > 0)} onClick={handleBar("competitor")} {...cursor}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={axis} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `Rp${v.toLocaleString("id-ID")}`} contentStyle={tt} />
              <Bar dataKey="avgPrice" name="Harga rata-rata" fill="#06b6d4" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Promo Kompetitor</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={s.promos} dataKey="value" nameKey="name" outerRadius={100} isAnimationActive={false} onClick={handlePie("promo")} label={{ fontSize: 10 }} {...cursor}>
                {s.promos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
              {legend}
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Strategi Marketing</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.strategies} layout="vertical" margin={{ left: 20 }} onClick={handleBar("strategy")} {...cursor}>
              <XAxis type="number" tick={axis} />
              <YAxis type="category" dataKey="name" tick={axis} width={110} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tt} />
              <Bar dataKey="value" name="Jumlah" fill="#22c55e" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="font-display text-base">Segmen Pelanggan & Daya Beli</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={s.segments} dataKey="value" nameKey="name" cx="30%" outerRadius={85} label={{ fontSize: 10 }} isAnimationActive={false} onClick={handlePie("segment")} {...cursor}>
                {s.segments.map((_, i) => <Cell key={`seg-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Pie data={s.dayaBeli} dataKey="value" nameKey="name" cx="75%" innerRadius={48} outerRadius={85} label={{ fontSize: 10 }} isAnimationActive={false} onClick={handlePie("dayaBeli")} {...cursor}>
                {s.dayaBeli.map((_, i) => <Cell key={`db-${i}`} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
