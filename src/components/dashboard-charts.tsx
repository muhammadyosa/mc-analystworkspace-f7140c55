import { useMemo } from "react";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, MapPin, Ticket, TrendingUp } from "lucide-react";
import {
  ArcDistribution,
  C,
  CATEGORICAL,
  ChartCard,
  DeltaBadge,
  axisProps,
  fmtFull,
  fmtNum,
  fmtPct,
  fmtSigned,
  hoverCursor,
  makeTooltip,
  truncateLabel,
} from "@/components/chart-kit";

type ClusterLike = {
  cluster: string;
  kabupaten?: string;
  pic?: string;
  mei?: number;
  juni: number;
  ticket?: number;
  deltaMeiJuni?: number;
};

type Stats = {
  trend: { month: string; hc: number }[];
  topHc: ClusterLike[];
  growth: (ClusterLike & { deltaMeiJuni: number })[];
  topTicket: (ClusterLike & { ticket: number })[];
  provDist: { name: string; value: number }[];
};

type ChartClick = { activePayload?: Array<{ payload: Record<string, unknown> }> };
type Kind = "cluster" | "province" | "month";

export default function DashboardCharts({
  stats: s,
  onSelect,
}: {
  stats: Stats;
  onSelect?: (kind: Kind, data: Record<string, unknown>) => void;
}) {
  const handleBar = (kind: Kind) => (p: ChartClick) => {
    const d = p?.activePayload?.[0]?.payload;
    if (d && onSelect) onSelect(kind, d);
  };
  const handlePie = (kind: Kind) => (data: Record<string, unknown>) => {
    if (data && onSelect) onSelect(kind, data);
  };
  const cursor = onSelect ? { style: { cursor: "pointer" } } : {};

  /* ---- derived, presentation-only ---- */
  const trend = useMemo(
    () =>
      s.trend.map((t, i) => {
        const prev = i > 0 ? s.trend[i - 1].hc : 0;
        return { ...t, growth: prev > 0 ? ((t.hc - prev) / prev) * 100 : 0, prevMonth: i > 0 ? s.trend[i - 1].month : "-" };
      }),
    [s.trend],
  );
  const last = trend[trend.length - 1];
  const peak = useMemo(() => [...s.trend].sort((a, b) => b.hc - a.hc)[0], [s.trend]);

  const topHc = useMemo(() => [...s.topHc].sort((a, b) => b.juni - a.juni).map((c, i) => ({ ...c, rank: i + 1 })), [s.topHc]);
  const maxHc = topHc[0]?.juni ?? 1;

  const growth = useMemo(() => [...s.growth].sort((a, b) => b.deltaMeiJuni - a.deltaMeiJuni), [s.growth]);
  const posCount = growth.filter((g) => g.deltaMeiJuni > 0).length;

  const topTicket = useMemo(
    () =>
      [...s.topTicket]
        .sort((a, b) => b.ticket - a.ticket)
        .map((c) => ({ ...c, perHc: c.juni > 0 ? c.ticket / c.juni : 0 })),
    [s.topTicket],
  );
  const maxTicket = topTicket[0]?.ticket ?? 1;

  const provTotal = s.provDist.reduce((a, b) => a + b.value, 0) || 1;
  const provDist = useMemo(() => [...s.provDist].sort((a, b) => b.value - a.value), [s.provDist]);
  const topProv = provDist[0];
  const provItems = useMemo(
    () => provDist.map((p, i) => ({ name: p.name, value: p.value, color: CATEGORICAL[i % CATEGORICAL.length] })),
    [provDist],
  );
  const provAnalysis = useMemo(() => {
    if (!provDist.length) return undefined;
    const top2 = provDist.slice(0, 2).reduce((a, b) => a + b.value, 0);
    const smallest = provDist[provDist.length - 1];
    const conc = (top2 / provTotal) * 100;
    return `${provDist.length} provinsi aktif. ${topProv.name} dominan ${fmtPct((topProv.value / provTotal) * 100)} dari ${fmtFull(provTotal)} HC; 2 provinsi teratas menguasai ${fmtPct(conc)} (${conc >= 70 ? "konsentrasi tinggi — perlu diversifikasi pasar" : "distribusi relatif merata"}). Kontribusi terkecil: ${smallest.name} ${fmtPct((smallest.value / provTotal) * 100)} — peluang ekspansi.`;
  }, [provDist, provTotal, topProv]);

  /* ---- tooltips ---- */
  const TrendTip = makeTooltip<(typeof trend)[number]>((d) => ({
    title: "HC Trend",
    rows: [
      { label: "Bulan", value: d.month },
      { label: "HC", value: fmtFull(d.hc), color: C.primary, strong: true },
      { label: `Growth vs ${d.prevMonth}`, value: fmtPct(d.growth, true) },
    ],
  }));

  const HcTip = makeTooltip<(typeof topHc)[number]>((d) => ({
    title: `#${d.rank} ${d.cluster}`,
    rows: [
      { label: "HC Juni", value: fmtFull(d.juni), color: C.primary, strong: true },
      { label: "Kabupaten", value: d.kabupaten || "-" },
      { label: "PIC", value: d.pic || "-" },
    ],
  }));

  const GrowthTip = makeTooltip<(typeof growth)[number]>((d) => {
    const pct = d.mei && d.mei > 0 ? (d.deltaMeiJuni / d.mei) * 100 : 0;
    return {
      title: d.cluster,
      rows: [
        { label: "HC Mei", value: fmtFull(d.mei ?? 0) },
        { label: "HC Juni", value: fmtFull(d.juni) },
        {
          label: "Delta",
          value: fmtSigned(d.deltaMeiJuni),
          color: d.deltaMeiJuni >= 0 ? C.positive : C.negative,
          strong: true,
        },
        { label: "Growth", value: fmtPct(pct, true) },
      ],
    };
  });

  const TicketTip = makeTooltip<(typeof topTicket)[number]>((d) => ({
    title: d.cluster,
    rows: [
      { label: "Total Ticket", value: fmtFull(d.ticket), color: C.negative, strong: true },
      { label: "HC", value: fmtFull(d.juni) },
      { label: "Ticket / HC", value: d.perHc.toFixed(2) },
      { label: "PIC", value: d.pic || "-" },
    ],
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* HC TREND */}
      <ChartCard
        icon={Activity}
        title="HC Trend"
        subtitle="Pergerakan HC Januari–Juni"
        badge={last ? <DeltaBadge value={last.growth} label=" vs bulan lalu" /> : undefined}
        height={300}
        footer={peak ? `HC tertinggi terjadi pada ${peak.month} (${fmtFull(peak.hc)}).` : undefined}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} onClick={handleBar("month")} {...cursor}>
            <defs>
              <linearGradient id="hcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={46} tickFormatter={(v) => fmtNum(v as number)} />
            <Tooltip content={TrendTip} cursor={{ stroke: C.primary, strokeOpacity: 0.35 }} />
            <Area type="monotone" dataKey="hc" stroke="none" fill="url(#hcFill)" isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="hc"
              stroke={C.primary}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* TOP HC CLUSTER */}
      <ChartCard
        icon={BarChart3}
        title="Top 10 Cluster by HC"
        subtitle="Cluster dengan HC terbesar bulan Juni"
        height={340}
        footer={topHc[0] ? `${topHc[0].cluster} memimpin dengan ${fmtFull(topHc[0].juni)} HC.` : undefined}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topHc}
            layout="vertical"
            margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
            onClick={handleBar("cluster")}
            {...cursor}
          >
            <XAxis type="number" hide domain={[0, maxHc * 1.15]} />
            <YAxis
              type="category"
              dataKey="cluster"
              {...axisProps}
              width={132}
              tickFormatter={(v) => truncateLabel(v, 18)}
            />
            <Tooltip content={HcTip} cursor={hoverCursor} />
            <Bar dataKey="juni" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
              {topHc.map((d) => (
                <Cell key={d.cluster} fill={d.rank <= 3 ? C.primary : C.primaryLight} />
              ))}
              <LabelList
                dataKey="juni"
                position="right"
                formatter={(v: number) => fmtFull(v)}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* HC GROWTH */}
      <ChartCard
        icon={TrendingUp}
        title="HC Growth (Delta Mei–Juni)"
        subtitle="Perubahan HC terbesar antar dua bulan terakhir"
        height={340}
        footer={`${posCount} dari ${growth.length} cluster mencatat pertumbuhan positif.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={growth}
            layout="vertical"
            margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
            onClick={handleBar("cluster")}
            {...cursor}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="cluster"
              {...axisProps}
              width={132}
              tickFormatter={(v) => truncateLabel(v, 18)}
            />
            <Tooltip content={GrowthTip} cursor={hoverCursor} />
            <Bar dataKey="deltaMeiJuni" radius={4} barSize={14} isAnimationActive={false}>
              {growth.map((g, i) => (
                <Cell
                  key={i}
                  fill={g.deltaMeiJuni > 0 ? C.positive : g.deltaMeiJuni < 0 ? C.negative : C.neutral}
                />
              ))}
              <LabelList
                dataKey="deltaMeiJuni"
                position="right"
                formatter={(v: number) => fmtSigned(v)}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* TICKET */}
      <ChartCard
        icon={Ticket}
        title="Top Cluster by Ticket"
        subtitle="Volume gangguan tertinggi — indikasi kualitas layanan"
        height={340}
        footer={
          topTicket[0]
            ? `${topTicket[0].cluster} tertinggi dengan ${fmtFull(topTicket[0].ticket)} ticket (${topTicket[0].perHc.toFixed(2)} ticket/HC).`
            : undefined
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topTicket}
            layout="vertical"
            margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
            onClick={handleBar("cluster")}
            {...cursor}
          >
            <XAxis type="number" hide domain={[0, maxTicket * 1.15]} />
            <YAxis
              type="category"
              dataKey="cluster"
              {...axisProps}
              width={132}
              tickFormatter={(v) => truncateLabel(v, 18)}
            />
            <Tooltip content={TicketTip} cursor={hoverCursor} />
            <Bar dataKey="ticket" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
              {topTicket.map((d, i) => (
                <Cell key={i} fill={C.negative} fillOpacity={0.45 + 0.55 * (d.ticket / maxTicket)} />
              ))}
              <LabelList
                dataKey="ticket"
                position="right"
                formatter={(v: number) => fmtFull(v)}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* PROVINCE */}
      <ChartCard
        icon={MapPin}
        title="Distribusi HC per Provinsi"
        subtitle="Kontribusi HC tiap provinsi"
        height={300}
        className="lg:col-span-2"
        footer={provAnalysis}
      >
        <ArcDistribution
          items={provItems}
          onSelect={onSelect ? (it) => handlePie("province")({ name: it.name, value: it.value }) : undefined}
        />
      </ChartCard>
    </div>
  );
}
