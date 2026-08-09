import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, Gauge, Megaphone, Target, Users, Wallet } from "lucide-react";
import {
  C,
  CATEGORICAL,
  ChartCard,
  axisProps,
  competitorColor,
  fmtFull,
  fmtNum,
  fmtPct,
  hoverCursor,
  makeTooltip,
  potensiColor,
  truncateLabel,
} from "@/components/chart-kit";

type Stats = {
  topCompetitors: { name: string; count: number; avgPrice: number }[];
  potensi: { tinggi: number; sedang: number; rendah: number };
  promos: { name: string; value: number }[];
  segments: { name: string; value: number }[];
  strategies: { name: string; value: number }[];
  dayaBeli: { name: string; value: number }[];
};

type TipComp = ReturnType<typeof makeTooltip>;

type Kind = "competitor" | "potensi" | "promo" | "segment" | "strategy" | "dayaBeli";
type ChartClick = { activePayload?: Array<{ payload: Record<string, unknown> }> };

/** Horizontal ranked bar — used for every long-label category. */
function RankedBar({
  data,
  valueKey,
  color,
  colorFor,
  onClick,
  cursor,
  tooltip,
  labelFormatter = (v: number) => fmtFull(v),
  labelWidth = 140,
}: {
  data: Array<Record<string, unknown>>;
  valueKey: string;
  color?: string;
  colorFor?: (d: Record<string, unknown>, i: number) => string;
  onClick?: (p: ChartClick) => void;
  cursor: Record<string, unknown>;
  tooltip: TipComp;
  labelFormatter?: (v: number) => string;
  labelWidth?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey] ?? 0)));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
        onClick={onClick}
        {...cursor}
      >
        <XAxis type="number" hide domain={[0, max * 1.15]} />
        <YAxis type="category" dataKey="name" {...axisProps} width={labelWidth} tickFormatter={(v) => truncateLabel(v, 20)} />
        <Tooltip content={tooltip} cursor={hoverCursor} />
        <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor ? colorFor(d, i) : (color ?? C.primary)} />
          ))}
          <LabelList
            dataKey={valueKey}
            position="right"
            formatter={labelFormatter}
            style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut with a dynamic center label. */
function Donut({
  data,
  colorFor,
  onClick,
  cursor,
  tooltip,
  centerValue,
  centerLabel,
}: {
  data: { name: string; value: number }[];
  colorFor: (d: { name: string; value: number }, i: number) => string;
  onClick?: (d: Record<string, unknown>) => void;
  cursor: Record<string, unknown>;
  tooltip: TipComp;
  centerValue: string;
  centerLabel: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
      <div className="relative h-full min-h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
              onClick={onClick}
              {...cursor}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(d, i)} />
              ))}
            </Pie>
            <Tooltip content={tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-bold tabular-nums">{centerValue}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colorFor(d, i) }} />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {fmtFull(d.value)}{" "}
              <span className="font-normal text-muted-foreground">({((d.value / total) * 100).toFixed(0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalystCharts({
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
  const handlePie = (kind: Kind) => (d: Record<string, unknown>) => {
    if (d && onSelect) onSelect(kind, d);
  };
  const cursor = onSelect ? { style: { cursor: "pointer" } } : {};

  const competitors = useMemo(
    () => [...s.topCompetitors].sort((a, b) => b.count - a.count).map((c) => ({ ...c, name: c.name })),
    [s.topCompetitors],
  );
  const compTotal = competitors.reduce((a, b) => a + b.count, 0) || 1;
  const priceRows = useMemo(
    () => competitors.filter((c) => c.avgPrice > 0).sort((a, b) => a.avgPrice - b.avgPrice),
    [competitors],
  );
  const priceAvg = priceRows.length ? priceRows.reduce((a, b) => a + b.avgPrice, 0) / priceRows.length : 0;

  const potensiData = useMemo(
    () => [
      { name: "Tinggi", value: s.potensi.tinggi },
      { name: "Sedang", value: s.potensi.sedang },
      { name: "Rendah", value: s.potensi.rendah },
    ],
    [s.potensi],
  );
  const potensiTotal = potensiData.reduce((a, b) => a + b.value, 0);

  const promos = useMemo(() => [...s.promos].sort((a, b) => b.value - a.value).slice(0, 10), [s.promos]);
  const strategies = useMemo(() => [...s.strategies].sort((a, b) => b.value - a.value).slice(0, 10), [s.strategies]);
  const segments = useMemo(() => [...s.segments].sort((a, b) => b.value - a.value), [s.segments]);
  const dayaBeli = useMemo(() => [...s.dayaBeli].sort((a, b) => b.value - a.value), [s.dayaBeli]);
  const segTotal = segments.reduce((a, b) => a + b.value, 0);
  const dbTotal = dayaBeli.reduce((a, b) => a + b.value, 0);

  /* tooltips */
  const CompTip = makeTooltip<{ name: string; count: number; avgPrice: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Kemunculan", value: fmtFull(d.count), color: C.primary, strong: true },
      { label: "Pangsa", value: fmtPct((d.count / compTotal) * 100) },
      { label: "Harga rata²", value: d.avgPrice ? `Rp${fmtFull(d.avgPrice)}` : "-" },
    ],
  }));

  const PriceTip = makeTooltip<{ name: string; avgPrice: number; count: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Harga rata²", value: `Rp${fmtFull(d.avgPrice)}`, color: C.info, strong: true },
      { label: "vs rata² pasar", value: fmtPct(priceAvg ? ((d.avgPrice - priceAvg) / priceAvg) * 100 : 0, true) },
      { label: "Sampel", value: `${fmtFull(d.count)} cluster` },
    ],
  }));

  const share = (total: number) =>
    makeTooltip<{ name: string; value: number }>((d) => ({
      title: d.name,
      rows: [
        { label: "Jumlah", value: fmtFull(d.value), strong: true },
        { label: "Porsi", value: fmtPct(total ? (d.value / total) * 100 : 0) },
      ],
    }));

  const PotensiTip = share(potensiTotal);
  const PromoTip = share(promos.reduce((a, b) => a + b.value, 0));
  const StrategyTip = share(strategies.reduce((a, b) => a + b.value, 0));
  const SegTip = share(segTotal);
  const DbTip = share(dbTotal);

  const cheapest = priceRows[0];
  const topPromo = promos[0];
  const topStrategy = strategies[0];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard
        icon={Building2}
        title="Top Kompetitor"
        subtitle="Frekuensi kemunculan di seluruh cluster"
        height={330}
        footer={
          competitors[0]
            ? `${competitors[0].name} paling dominan (${fmtPct((competitors[0].count / compTotal) * 100)} dari total temuan).`
            : undefined
        }
      >
        <RankedBar
          data={competitors as unknown as Array<Record<string, unknown>>}
          valueKey="count"
          colorFor={(d, i) => competitorColor(String(d.name), i)}
          onClick={handleBar("competitor")}
          cursor={cursor}
          tooltip={CompTip}
        />
      </ChartCard>

      <ChartCard
        icon={Gauge}
        title="Potensi Cluster"
        subtitle="Sebaran level potensi hasil profiling"
        height={330}
        footer={
          potensiTotal
            ? `${fmtPct((s.potensi.tinggi / potensiTotal) * 100)} cluster berpotensi tinggi dan layak diprioritaskan.`
            : undefined
        }
      >
        <Donut
          data={potensiData}
          colorFor={(d) => potensiColor(d.name)}
          onClick={handlePie("potensi")}
          cursor={cursor}
          tooltip={PotensiTip}
          centerValue={fmtFull(s.potensi.tinggi)}
          centerLabel="Potensi Tinggi"
        />
      </ChartCard>

      <ChartCard
        icon={Wallet}
        title="Harga Rata-rata Kompetitor"
        subtitle="Diurutkan dari termurah — indikasi tekanan harga"
        height={330}
        footer={
          cheapest
            ? `${cheapest.name} termurah di Rp${fmtFull(cheapest.avgPrice)}, ${fmtPct(priceAvg ? ((priceAvg - cheapest.avgPrice) / priceAvg) * 100 : 0)} di bawah rata-rata pasar.`
            : undefined
        }
      >
        <RankedBar
          data={priceRows as unknown as Array<Record<string, unknown>>}
          valueKey="avgPrice"
          colorFor={(d) => (Number(d.avgPrice) < priceAvg ? C.negative : C.info)}
          onClick={handleBar("competitor")}
          cursor={cursor}
          tooltip={PriceTip}
          labelFormatter={(v) => `Rp${fmtNum(v)}`}
        />
      </ChartCard>

      <ChartCard
        icon={Megaphone}
        title="Promo Kompetitor"
        subtitle="Jenis promo yang paling sering ditemukan"
        height={330}
        footer={topPromo ? `Promo dominan: ${topPromo.name} (${fmtFull(topPromo.value)} temuan).` : undefined}
      >
        <RankedBar
          data={promos as unknown as Array<Record<string, unknown>>}
          valueKey="value"
          colorFor={(_, i) => CATEGORICAL[i % CATEGORICAL.length]}
          onClick={handleBar("promo")}
          cursor={cursor}
          tooltip={PromoTip}
          labelWidth={150}
        />
      </ChartCard>

      <ChartCard
        icon={Target}
        title="Strategi Marketing"
        subtitle="Pendekatan yang direkomendasikan per cluster"
        height={330}
        footer={topStrategy ? `Strategi paling banyak dipakai: ${topStrategy.name}.` : undefined}
      >
        <RankedBar
          data={strategies as unknown as Array<Record<string, unknown>>}
          valueKey="value"
          color={C.positive}
          onClick={handleBar("strategy")}
          cursor={cursor}
          tooltip={StrategyTip}
          labelWidth={150}
        />
      </ChartCard>

      <ChartCard
        icon={Users}
        title="Segmen Pelanggan"
        subtitle="Profil segmen dominan"
        height={330}
        footer={segments[0] ? `Segmen terbesar: ${segments[0].name} (${fmtFull(segments[0].value)} cluster).` : undefined}
      >
        <Donut
          data={segments}
          colorFor={(_, i) => CATEGORICAL[i % CATEGORICAL.length]}
          onClick={handlePie("segment")}
          cursor={cursor}
          tooltip={SegTip}
          centerValue={fmtFull(segTotal)}
          centerLabel="Total Cluster"
        />
      </ChartCard>

      <ChartCard
        icon={Wallet}
        title="Daya Beli"
        subtitle="Kemampuan belanja pelanggan per cluster"
        height={330}
        className="lg:col-span-2"
        footer={dayaBeli[0] ? `Mayoritas cluster berada pada daya beli ${dayaBeli[0].name}.` : undefined}
      >
        <Donut
          data={dayaBeli}
          colorFor={(d, i) => potensiColor(d.name) || CATEGORICAL[i % CATEGORICAL.length]}
          onClick={handlePie("dayaBeli")}
          cursor={cursor}
          tooltip={DbTip}
          centerValue={fmtFull(dbTotal)}
          centerLabel="Total Cluster"
        />
      </ChartCard>
    </div>
  );
}
