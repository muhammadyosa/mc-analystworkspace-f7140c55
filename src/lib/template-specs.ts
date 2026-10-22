import type { ImportKind } from "./excel";

export type TemplateColumn = {
  /** Nama kolom utama pada file Excel */
  name: string;
  /** Penulisan lain yang tetap dikenali sistem */
  aliases?: string[];
  /** Contoh isi kolom */
  example: string;
  required?: boolean;
};

export type TemplateSpec = {
  kind: ImportKind;
  label: string;
  sheet: string;
  icon: string;
  description: string;
  columns: TemplateColumn[];
};

export const TEMPLATE_SPECS: TemplateSpec[] = [
  {
    kind: "cluster",
    label: "Template Cluster",
    sheet: "RAW DATA CLUSTER",
    icon: "🗂️",
    description: "Master data cluster: homepass, HC aktif per bulan, ticket, dan wilayah.",
    columns: [
      {
        name: "CLUSTER",
        aliases: ["NAMA CLUSTER"],
        example: "CLUSTER BANDUNG KOTA",
        required: true,
      },
      { name: "Homepass", example: "512", required: true },
      { name: "HC Terpasang", example: "318" },
      { name: "HC Aktif", aliases: ["Grand Total HC Aktif"], example: "295", required: true },
      { name: "Available", example: "194" },
      { name: "TUR HC", example: "62%" },
      { name: "PIC", aliases: ["AE", "NAMA PIC"], example: "Rizky Ananda" },
      { name: "Churn", example: "7" },
      { name: "HC AKTIF JANUARI … AGST", aliases: ["HC AKTIF JULI"], example: "265, 271, 288, …" },
      { name: "NEW HC JANUARI … AGST", aliases: ["NEW HC JULI"], example: "12, 9, 17, …" },
      { name: "Ticket Jan … TICKET AGST", aliases: ["Ticket Juli"], example: "31, 28, 44, …" },
      { name: "Kabupaten/Kota", example: "Kab. Bandung" },
      { name: "PROVINSI", example: "Jawa Barat" },
      { name: "IKR", example: "IKR-01" },
      { name: "SERPO", example: "SERPO BANDUNG" },
    ],
  },
  {
    kind: "ticket",
    label: "Template Ticket",
    sheet: "TICKET",
    icon: "🎫",
    description: "Rekap jumlah ticket gangguan per cluster per bulan (format pivot).",
    columns: [
      { name: "CLUSTER", example: "CLUSTER BANDUNG KOTA", required: true },
      { name: "Jan", aliases: ["Januari", "Ticket Jan"], example: "31", required: true },
      { name: "Feb", aliases: ["Februari"], example: "28" },
      { name: "Mar", aliases: ["Maret"], example: "44" },
      { name: "Apr", aliases: ["April"], example: "39" },
      { name: "Mei", aliases: ["May"], example: "41" },
      { name: "Jun", aliases: ["Juni"], example: "37" },
      { name: "Jul", aliases: ["Juli"], example: "46" },
      { name: "Agt", aliases: ["Agst", "Agustus"], example: "52" },
      { name: "Sep … Des", aliases: ["Okt", "Nov", "Des"], example: "48, 40, …" },
      { name: "Grand Total", example: "358 (opsional, diabaikan)" },
    ],
  },
  {
    kind: "analyst",
    label: "Template Analyst Market",
    sheet: "HASIL PROFILING",
    icon: "🔎",
    description: "Hasil canvassing & profiling harian AE di lapangan.",
    columns: [
      { name: "Nama AE", example: "Dwi Prasetyo", required: true },
      { name: "TANGGAL CANVASING & PROFILING", example: "08/09/2026", required: true },
      { name: "CLUSTER", example: "CLUSTER BANDUNG KOTA", required: true },
      { name: "SEBUTKAN KOMPETITOR YANG ADA DI SANA", example: "Indihome, MyRepublic" },
      { name: "SEBUTKAN BERAPA HARGA RATA-RATA KOMPETITOR", example: "250000" },
      { name: "PROMO KOMPETITOR", example: "Gratis 1 bulan" },
      { name: "TINGKAT POTENSI CLUSTER", example: "Tinggi / Sedang / Rendah" },
      { name: "Status Tool Kits", example: "Lengkap" },
      { name: "SF/MI HARI INI", example: "6" },
      { name: "CLOSE WON HARI INI", example: "2" },
      { name: "SEGMEN PELANGGAN", example: "Rumah tangga" },
      { name: "DAYA BELI", example: "Menengah" },
      { name: "INSIGHT AE", example: "Banyak warga minat paket 30 Mbps" },
    ],
  },
  {
    kind: "competitor",
    label: "Template Competitor",
    sheet: "KOMPETITOR",
    icon: "📡",
    description: "Daftar kompetitor per cluster beserta harga dan promo.",
    columns: [
      { name: "CLUSTER", example: "CLUSTER BANDUNG KOTA", required: true },
      { name: "KABUPATEN", example: "Kab. Bandung" },
      { name: "PROVINSI", example: "Jawa Barat" },
      { name: "NAMA KOMPETITOR", example: "MyRepublic", required: true },
      { name: "HARGA KOMPETITOR TERMURAH", example: "199000", required: true },
      { name: "PROMO COMPETITOR", example: "Diskon 50% 3 bulan" },
    ],
  },
  {
    kind: "actionplan",
    label: "Template Action Plan",
    sheet: "ACTION PLAN",
    icon: "🗓️",
    description: "Program kerja per PIC dengan tanggal mulai, selesai, dan hasilnya.",
    columns: [
      { name: "NAMA", aliases: ["PIC"], example: "Rizky Ananda", required: true },
      { name: "CLUSTER", example: "CLUSTER BANDUNG KOTA", required: true },
      { name: "PROGRAM", example: "Door to Door", required: true },
      { name: "START DATE", example: "01/09/2026", required: true },
      { name: "END DATE", example: "15/09/2026", required: true },
      { name: "KETERANGAN", example: "Fokus RW 04 dan RW 05" },
      { name: "Hasil", aliases: ["Outcome"], example: "12 SF, 4 close won" },
    ],
  },
];

export function getTemplateSpec(kind: ImportKind) {
  return TEMPLATE_SPECS.find((s) => s.kind === kind);
}

// ===== Validasi format file yang sudah diupload =====

export type FormatCheck = {
  name: string;
  required?: boolean;
  ok: boolean;
};

type AnyRow = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const hasStr = (key: string) => (rows: AnyRow[]) => rows.some((r) => str(r[key]).length > 0);
const hasNum = (key: string) => (rows: AnyRow[]) => rows.some((r) => num(r[key]) > 0);

const MONTH_PREFIX: Record<string, string[]> = {
  jan: ["jan"],
  feb: ["feb"],
  mar: ["mar"],
  apr: ["apr"],
  mei: ["mei", "may"],
  jun: ["jun"],
  jul: ["jul"],
  agt: ["agt", "ags", "agu", "aug"],
  sep: ["sep"],
  okt: ["okt", "oct"],
  nov: ["nov"],
  des: ["des", "dec"],
};

function ticketMonthCheck(col: TemplateColumn) {
  const names = [col.name, ...(col.aliases ?? [])].map((n) =>
    n
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 3),
  );
  const prefixes = names.flatMap((n) => MONTH_PREFIX[n] ?? []);
  return (rows: AnyRow[]) =>
    rows.some((r) => {
      const b = str(r["bulan"])
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      return (
        prefixes.some((p) => b.startsWith(p)) && num(r["ticket"]) >= 0 && str(r["bulan"]).length > 0
      );
    });
}

const CLUSTER_MONTH_KEYS = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

function clusterMonthsOk(key: string | null): (rows: AnyRow[]) => boolean {
  return (rows) =>
    rows.some((r) => {
      if (key) {
        const rec = r[key] as Record<string, number> | undefined;
        return rec ? Object.values(rec).some((v) => num(v) > 0) : false;
      }
      return CLUSTER_MONTH_KEYS.some((m) => num(r[m]) > 0);
    });
}

/** Pemetaan kolom template -> pengecekan terhadap data yang tersimpan. */
function checkerFor(kind: ImportKind, col: TemplateColumn): (rows: AnyRow[]) => boolean {
  const n = col.name.toLowerCase();
  if (kind === "cluster") {
    if (n.startsWith("hc aktif") && n.includes("…")) return clusterMonthsOk(null);
    if (n.startsWith("new hc")) return clusterMonthsOk("newHCByMonth");
    if (n.startsWith("ticket")) return clusterMonthsOk("ticketByMonth");
    const map: Record<string, (rows: AnyRow[]) => boolean> = {
      cluster: hasStr("cluster"),
      homepass: hasNum("homepass"),
      "hc terpasang": hasNum("hcTerpasang"),
      "hc aktif": hasNum("hcAktif"),
      available: hasNum("available"),
      "tur hc": hasNum("turHC"),
      pic: hasStr("pic"),
      churn: hasNum("churn"),
      "kabupaten/kota": hasStr("kabupaten"),
      provinsi: hasStr("provinsi"),
      ikr: hasStr("ikrStatus"),
      serpo: hasStr("serpoStatus"),
    };
    return map[n] ?? (() => true);
  }
  if (kind === "ticket") {
    if (n === "cluster") return hasStr("cluster");
    if (n.startsWith("grand")) return () => true; // opsional
    return ticketMonthCheck(col);
  }
  if (kind === "analyst") {
    if (n.includes("tanggal"))
      return (rows) => rows.some((r) => str(r["profilingDate"]) || str(r["timestamp"]));
    if (n.includes("harga")) return hasNum("competitorPrice");
    if (n.includes("kompetitor yang ada")) return hasStr("competitor");
    if (n.includes("promo")) return hasStr("competitorPromo");
    if (n.includes("potensi")) return hasStr("potential");
    if (n.includes("tool kits")) return hasStr("toolkitStatus");
    if (n.startsWith("sf/"))
      return (rows) => rows.some((r) => num(r["sfToday"]) > 0 || num(r["sfTotal"]) > 0);
    if (n.includes("close won"))
      return (rows) =>
        rows.some((r) => num(r["closewonToday"]) >= 0 && str(r["aeName"]).length > 0);
    if (n.includes("segmen")) return hasStr("customerSegment");
    if (n.includes("daya beli")) return hasStr("purchasingPower");
    if (n.includes("insight")) return hasStr("aeInsight");
    if (n.includes("nama ae")) return hasStr("aeName");
    if (n === "cluster") return hasStr("cluster");
    return () => true;
  }
  if (kind === "competitor") {
    const map: Record<string, (rows: AnyRow[]) => boolean> = {
      cluster: hasStr("cluster"),
      kabupaten: hasStr("kabupaten"),
      provinsi: hasStr("provinsi"),
      "nama kompetitor": hasStr("competitor"),
      "harga kompetitor termurah": hasNum("price"),
      "promo competitor": hasStr("promo"),
    };
    return map[n] ?? (() => true);
  }
  // actionplan
  const map: Record<string, (rows: AnyRow[]) => boolean> = {
    nama: hasStr("pic"),
    cluster: hasStr("cluster"),
    program: hasStr("program"),
    "start date": hasStr("startDate"),
    "end date": hasStr("endDate"),
    keterangan: hasStr("description"),
    hasil: () => true, // opsional, sering kosong saat awal
  };
  return map[n] ?? (() => true);
}

/**
 * Evaluasi kecocokan data yang tersimpan dengan format template.
 * Mengembalikan null jika dataset belum diupload.
 */
export function evaluateTemplateFormat(kind: ImportKind, rows: unknown[]): FormatCheck[] | null {
  if (!rows.length) return null;
  const spec = getTemplateSpec(kind);
  if (!spec) return null;
  const anyRows = rows as AnyRow[];
  return spec.columns.map((col) => ({
    name: col.name,
    required: col.required,
    ok: checkerFor(kind, col)(anyRows),
  }));
}
