import * as XLSX from "xlsx";

export type ClusterRow = {
  id: string;
  cluster: string;
  kabupaten: string;
  provinsi: string;
  pic: string;
  januari: number;
  februari: number;
  maret: number;
  april: number;
  mei: number;
  juni: number;
  grandTotal: number;
  mei1: number;
  juni1: number;
  deltaMeiJuni: number;
  ticket: number;
  totalHC2026: number;
  serpoStatus: string;
  ikrStatus: string;
};

export type TicketRow = {
  cluster: string;
  bulan: string;
  ticket: number;
  kategori: string;
  penyebab: string;
  status: string;
};

export type AnalystRow = {
  id: string;
  timestamp: string;
  aeName: string;
  profilingDate: string;
  cluster: string;
  competitor: string;
  competitorPrice: number;
  competitorPromo: string;
  ageSegment: string;
  occupation: string;
  clusterCondition: string;
  potential: string;
  potentialReason: string;
  toolkitStatus: string;
  toolkitRequest: string;
  productStrategy: string;
  nextPriority: string;
  priorityReason: string;
  fatRelocation: string;
  fatReason: string;
  complaint: string;
  sfToday: number;
  closewonToday: number;
  sfTotal: number;
  partner: string;
  partnerName: string;
  partnerPotential: string;
  marketingStrategy: string;
  customerSegment: string;
  purchasingPower: string;
  aeInsight: string;
  evidence: string;
};

export type CompetitorRow = {
  id: string;
  cluster: string;
  kabupaten: string;
  provinsi: string;
  competitor: string;
  competitorRaw: string;
  price: number;
  promo: string;
  promoCategory: PromoCategory;
};

export type PromoCategory =
  | "Gratis Instalasi"
  | "Diskon Instalasi"
  | "Upgrade Kecepatan"
  | "Cashback"
  | "Bundling"
  | "Tidak Ada Promo"
  | "Lainnya";

export type ActionPlanStatus = "planned" | "onprogress" | "completed" | "overdue";
export type ActionPlanRow = {
  id: string;
  pic: string;
  cluster: string;
  program: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  description: string;
  result: string;
  status: ActionPlanStatus;
  durationDays: number;
};

export type UploadMeta = {
  fileName: string;
  sheetCount: number;
  sheetPicked: string;
  rowCount: number;
  extra: Record<string, number | string>;
  mappingPct: number;
  timestamp: number;
};

const toNum = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).replace(/[,\s]/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
const toStr = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

function toISODate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && isFinite(v)) {
    try {
      const parsed = XLSX.SSF.parse_date_code(v);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    } catch { /* fall through */ }
  }
  const s = String(v).trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

export function computeActionStatus(startISO: string, endISO: string): ActionPlanStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = startISO ? new Date(startISO) : null;
  const e = endISO ? new Date(endISO) : null;
  if (e && e < today) return "completed";
  if (s && s > today) return "planned";
  if (s && e && s <= today && today <= e) return "onprogress";
  if (e && e < today) return "overdue";
  return "planned";
}

function statusWithOverdue(startISO: string, endISO: string): ActionPlanStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = endISO ? new Date(endISO) : null;
  const s = startISO ? new Date(startISO) : null;
  if (s && s > today) return "planned";
  if (s && e && s <= today && today <= e) return "onprogress";
  if (e && e < today) return "overdue"; // will be flipped to completed only via kanban manual override in UI
  return "planned";
}

const norm = (s: string) => s.toLowerCase().replace(/[\s._\-\/]/g, "");

// Find a value by fuzzy header match; supports duplicate-column suffixes (.1, _2)
const pick = (r: Record<string, unknown>, patterns: string[]): unknown => {
  const keys = Object.keys(r);
  for (const p of patterns) {
    const np = norm(p);
    const found = keys.find((k) => norm(k) === np);
    if (found !== undefined) return r[found];
  }
  for (const p of patterns) {
    const np = norm(p);
    const found = keys.find((k) => norm(k).includes(np));
    if (found !== undefined) return r[found];
  }
  return undefined;
};

// Pick sheet by name (fuzzy) or fallback to sheet with most rows
function pickSheet(wb: XLSX.WorkBook, preferred: string[]): { name: string; ws: XLSX.WorkSheet } {
  const names = wb.SheetNames;
  for (const p of preferred) {
    const np = norm(p);
    const hit = names.find((n) => norm(n) === np) ?? names.find((n) => norm(n).includes(np));
    if (hit) return { name: hit, ws: wb.Sheets[hit] };
  }
  // fallback: sheet with the most rows
  let best = names[0];
  let bestRows = -1;
  for (const n of names) {
    const ws = wb.Sheets[n];
    const ref = ws["!ref"];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    const rows = range.e.r - range.s.r;
    if (rows > bestRows) {
      bestRows = rows;
      best = n;
    }
  }
  return { name: best, ws: wb.Sheets[best] };
}

// Auto-clean: trim strings, drop empty rows/cols, normalize duplicate headers (MEI, MEI_2)
function sheetToCleanJson(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
  if (!aoa.length) return [];
  // find first non-empty row = header
  let headerIdx = 0;
  while (headerIdx < aoa.length && aoa[headerIdx].every((c) => toStr(c) === "")) headerIdx++;
  const rawHeaders = (aoa[headerIdx] ?? []).map((h) => toStr(h));

  // dedupe headers -> Name, Name_2, Name_3
  const seen: Record<string, number> = {};
  const headers = rawHeaders.map((h) => {
    const key = h || "COL";
    seen[key] = (seen[key] ?? 0) + 1;
    return seen[key] === 1 ? key : `${key}_${seen[key]}`;
  });

  const rows: Record<string, unknown>[] = [];
  const seenRows = new Set<string>();
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const arr = aoa[i];
    if (!arr || arr.every((c) => toStr(c) === "")) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const v = arr[idx];
      obj[h] = typeof v === "string" ? v.trim() : v;
    });
    const sig = JSON.stringify(obj);
    if (seenRows.has(sig)) continue;
    seenRows.add(sig);
    rows.push(obj);
  }
  return rows;
}

export async function parseClusterFile(
  file: File,
): Promise<{ rows: ClusterRow[]; meta: UploadMeta }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const { name: sheetName, ws } = pickSheet(wb, ["DATA CLUSTER", "CLUSTER", "PEMBAGIAN"]);
  const raw = sheetToCleanJson(ws);
  let mapped = 0;
  const rows = raw
    .map((r, idx): ClusterRow | null => {
      const cluster = toStr(pick(r, ["PROV/KAB/CLUSTER", "cluster"]));
      if (!cluster) return null;
      mapped++;
      return {
        id: `${idx}-${cluster}`,
        cluster,
        kabupaten: toStr(pick(r, ["KABUPATEN/KOTA YG BENAR", "kabupaten"])),
        provinsi: toStr(pick(r, ["Provinsi", "provinsi"])),
        pic: toStr(pick(r, ["PIC"])),
        januari: toNum(pick(r, ["JANUARI"])),
        februari: toNum(pick(r, ["FEBRUARI"])),
        maret: toNum(pick(r, ["MARET"])),
        april: toNum(pick(r, ["APRIL"])),
        mei: toNum(pick(r, ["MEI"])),
        juni: toNum(pick(r, ["JUNI"])),
        grandTotal: toNum(pick(r, ["Grand Total", "GRAND TOTAL"])),
        mei1: toNum(pick(r, ["MEI_2", "MEI.1", "MEI 1"])),
        juni1: toNum(pick(r, ["JUNI_2", "JUNI.1", "JUNI 1"])),
        deltaMeiJuni: toNum(pick(r, ["DELTA MEI - JUNI", "DELTA MEI-JUNI", "DELTA"])),
        ticket: toNum(pick(r, ["ticket", "TICKET"])),
        totalHC2026: toNum(pick(r, ["TOTAL HC 2026", "TOTAL HC"])),
        serpoStatus: toStr(pick(r, ["STATUS KETERSEDIAAN TIM SERPO", "SERPO"])),
        ikrStatus: toStr(pick(r, ["STATUS KETERSEDIAAN TIM IKR", "IKR"])),
      };
    })
    .filter((r): r is ClusterRow => r !== null);

  const kab = new Set(rows.map((r) => r.kabupaten).filter(Boolean));
  const prov = new Set(rows.map((r) => r.provinsi).filter(Boolean));
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: { Cluster: rows.length, Kabupaten: kab.size, Provinsi: prov.size },
    mappingPct: raw.length ? Math.round((mapped / raw.length) * 100) : 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

const BULAN_KEYS = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

export async function parseTicketFile(
  file: File,
): Promise<{ rows: TicketRow[]; meta: UploadMeta }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  // find sheet with most rows
  const { name: sheetName, ws } = pickSheet(wb, ["TICKET", "DATA", "PIVOT"]);
  const raw = sheetToCleanJson(ws);

  const rows: TicketRow[] = [];
  for (const r of raw) {
    const cluster = toStr(
      pick(r, ["cluster", "wilayah", "kabupaten", "area", "PROV/KAB/CLUSTER"]),
    );
    if (!cluster) continue;
    // Pivot flatten: one row per bulan column with a numeric value
    let flattened = false;
    for (const b of BULAN_KEYS) {
      const v = pick(r, [b]);
      if (v !== undefined && v !== "" && v !== null) {
        const n = toNum(v);
        if (n > 0 || typeof v === "number") {
          rows.push({
            cluster,
            bulan: b,
            ticket: n,
            kategori: toStr(pick(r, ["kategori", "category"])),
            penyebab: toStr(pick(r, ["penyebab", "cause", "root cause"])),
            status: toStr(pick(r, ["status"])),
          });
          flattened = true;
        }
      }
    }
    if (!flattened) {
      // normal (non-pivot) table
      const ticket = toNum(pick(r, ["ticket", "jumlah", "count", "total"]));
      const bulan = toStr(pick(r, ["bulan", "month"]));
      if (ticket > 0 || bulan) {
        rows.push({
          cluster,
          bulan,
          ticket,
          kategori: toStr(pick(r, ["kategori"])),
          penyebab: toStr(pick(r, ["penyebab"])),
          status: toStr(pick(r, ["status"])),
        });
      }
    }
  }

  const clusters = new Set(rows.map((r) => r.cluster));
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: { Cluster: clusters.size, Records: rows.length },
    mappingPct: 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

export async function parseAnalystFile(
  file: File,
): Promise<{ rows: AnalystRow[]; meta: UploadMeta }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const { name: sheetName, ws } = pickSheet(wb, ["HASIL PROFILING", "PROFILING", "ANALYST"]);
  const raw = sheetToCleanJson(ws);
  let mapped = 0;
  const rows = raw
    .map((r, idx): AnalystRow | null => {
      const cluster = toStr(pick(r, ["CLUSTER"]));
      const ae = toStr(pick(r, ["Nama AE", "NAMA AE", "AE"]));
      if (!cluster && !ae) return null;
      mapped++;
      return {
        id: `${idx}-${cluster || ae}`,
        timestamp: toStr(pick(r, ["Timestamp"])),
        aeName: ae,
        profilingDate: toStr(pick(r, ["TANGGAL CANVASING & PROFILING", "TANGGAL"])),
        cluster,
        competitor: toStr(pick(r, ["SEBUTKAN KOMPETITOR YANG ADA DI SANA", "KOMPETITOR"])),
        competitorPrice: toNum(pick(r, ["SEBUTKAN BERAPA HARGA RATA-RATA KOMPETITOR", "HARGA RATA-RATA KOMPETITOR"])),
        competitorPromo: toStr(pick(r, ["PROMO KOMPETITOR"])),
        ageSegment: toStr(pick(r, ["RATA-RATA USIA", "USIA"])),
        occupation: toStr(pick(r, ["RATA-RATA PEKERJAAN", "PEKERJAAN"])),
        clusterCondition: toStr(pick(r, ["KETERANGAN CLUSTER"])),
        potential: toStr(pick(r, ["TINGKAT POTENSI CLUSTER", "POTENSI"])),
        potentialReason: toStr(pick(r, ["ALASAN PENILAIAN POTENSI"])),
        toolkitStatus: toStr(pick(r, ["Status Tool Kits", "STATUS TOOLKIT"])),
        toolkitRequest: toStr(pick(r, ["BUTUH PENAMBAHAN TOOLKITS", "PENAMBAHAN TOOLKIT"])),
        productStrategy: toStr(pick(r, ["STRATEGI PRODUK"])),
        nextPriority: toStr(pick(r, ["PRIORITAS BULAN DEPAN"])),
        priorityReason: toStr(pick(r, ["ALASAN"])),
        fatRelocation: toStr(pick(r, ["RELOKASI FAT"])),
        fatReason: toStr(pick(r, ["ALASAN RELOKASI"])),
        complaint: toStr(pick(r, ["KELUHAN"])),
        sfToday: toNum(pick(r, ["SF/MI HARI INI"])),
        closewonToday: toNum(pick(r, ["CLOSE WON HARI INI"])),
        sfTotal: toNum(pick(r, ["TOTAL SF/MI"])),
        partner: toStr(pick(r, ["MITRA BARU"])),
        partnerName: toStr(pick(r, ["NAMA MITRA"])),
        partnerPotential: toStr(pick(r, ["POTENSI MITRA"])),
        marketingStrategy: toStr(pick(r, ["STRATEGI PEMASARAN"])),
        customerSegment: toStr(pick(r, ["SEGMEN PELANGGAN"])),
        purchasingPower: toStr(pick(r, ["DAYA BELI"])),
        aeInsight: toStr(pick(r, ["INSIGHT AE"])),
        evidence: toStr(pick(r, ["EVIDENCE"])),
      };
    })
    .filter((r): r is AnalystRow => r !== null);

  const ae = new Set(rows.map((r) => r.aeName).filter(Boolean));
  const clusters = new Set(rows.map((r) => r.cluster).filter(Boolean));
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: { Profiling: rows.length, AE: ae.size, Cluster: clusters.size },
    mappingPct: raw.length ? Math.round((mapped / raw.length) * 100) : 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

// ---------- Competitor parser ----------

const COMPETITOR_ALIASES: Record<string, string> = {
  indihome: "IndiHome",
  indihom: "IndiHome",
  ihome: "IndiHome",
  xlhome: "XL Home",
  xl: "XL Home",
  myrepublik: "MyRepublic",
  myrepublic: "MyRepublic",
  republik: "MyRepublic",
  rtrwnet: "RT/RW Net",
  rtrwn: "RT/RW Net",
  rtrw: "RT/RW Net",
  biznet: "Biznet",
  biznethome: "Biznet",
  cbn: "CBN",
  cbnfiber: "CBN",
  mncplay: "MNC Play",
  mnc: "MNC Play",
  firstmedia: "First Media",
  first: "First Media",
  oxygen: "Oxygen",
  moratelindo: "Moratelindo",
  megavision: "Megavision",
  iforte: "iForte",
  netciti: "Netciti",
  transvision: "Transvision",
  useetv: "UseeTV",
};

export function normalizeCompetitorName(raw: string): string {
  // strip weird superscript/control chars, keep letters+digits+slash+space
  const cleaned = raw
    .replace(/[\u00B2\u00B3\u00B9\u2070-\u209F\u2000-\u200F\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}\/\s.\-&]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const key = cleaned.toLowerCase().replace(/[\s.\-\/&]/g, "");
  if (COMPETITOR_ALIASES[key]) return COMPETITOR_ALIASES[key];
  // Title case fallback
  return cleaned
    .split(" ")
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ");
}

export function splitCompetitors(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\/\n](?![^(]*\))/)
    .flatMap((s) => s.split(/\s+dan\s+/i))
    .map((s) => normalizeCompetitorName(s))
    .filter(Boolean);
}

const PROMO_RULES: { cat: PromoCategory; kws: string[] }[] = [
  { cat: "Gratis Instalasi", kws: ["gratis instal", "free instal", "instalasi gratis", "bebas instal"] },
  { cat: "Diskon Instalasi", kws: ["diskon instal", "diskon biaya instal", "disc instal", "potongan instal"] },
  { cat: "Upgrade Kecepatan", kws: ["upgrade kecepatan", "upgrade speed", "tambah kecepatan", "double speed"] },
  { cat: "Cashback", kws: ["cashback", "cash back"] },
  { cat: "Bundling", kws: ["bundling", "bundle", "paket"] },
];

export function categorizePromo(raw: string): PromoCategory {
  const s = raw.trim().toLowerCase();
  if (!s || s === "-" || s === "tidak ada" || s.includes("tidak ada promo") || s === "none" || s === "no") {
    return "Tidak Ada Promo";
  }
  for (const r of PROMO_RULES) if (r.kws.some((k) => s.includes(k))) return r.cat;
  return "Lainnya";
}

export async function parseCompetitorFile(
  file: File,
): Promise<{ rows: CompetitorRow[]; meta: UploadMeta }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const { name: sheetName, ws } = pickSheet(wb, ["KOMPETITOR", "COMPETITOR", "DATA"]);
  const raw = sheetToCleanJson(ws);
  const rows: CompetitorRow[] = [];
  let mapped = 0;
  let idx = 0;
  for (const r of raw) {
    const cluster = toStr(pick(r, ["CLUSTER", "cluster"]));
    const namaRaw = toStr(
      pick(r, ["NAMA KOMPETITOR", "KOMPETITOR", "NAMA COMPETITOR", "COMPETITOR"]),
    );
    if (!cluster && !namaRaw) continue;
    mapped++;
    const price = toNum(
      pick(r, [
        "HARGA KOMPETITOR TERMURAH",
        "HARGA KOMPETITOR",
        "HARGA TERMURAH",
        "HARGA",
      ]),
    );
    const promoRaw = toStr(pick(r, ["PROMO COMPETITOR", "PROMO KOMPETITOR", "PROMO"]));
    const kab = toStr(pick(r, ["KABUPATEN", "KABUPATEN/KOTA", "KABUPATEN/KOTA YG BENAR"]));
    const prov = toStr(pick(r, ["PROVINSI", "Provinsi"]));
    const promoCategory = categorizePromo(promoRaw);
    const names = splitCompetitors(namaRaw);
    if (names.length === 0) continue;
    for (const nm of names) {
      rows.push({
        id: `${idx++}-${cluster}-${nm}`,
        cluster,
        kabupaten: kab,
        provinsi: prov,
        competitor: nm,
        competitorRaw: namaRaw,
        price,
        promo: promoRaw,
        promoCategory,
      });
    }
  }
  // Dedupe (cluster + competitor + price + promo)
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    const k = `${r.cluster}|${r.competitor}|${r.price}|${r.promo}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const clusters = new Set(deduped.map((r) => r.cluster).filter(Boolean));
  const unique = new Set(deduped.map((r) => r.competitor));
  const prices = deduped.map((r) => r.price).filter((p) => p > 0);
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: deduped.length,
    extra: {
      Cluster: clusters.size,
      Kompetitor: unique.size,
      Promo: new Set(deduped.map((r) => r.promoCategory)).size,
      HargaMin: prices.length ? Math.min(...prices) : 0,
      HargaMax: prices.length ? Math.max(...prices) : 0,
    },
    mappingPct: raw.length ? Math.round((mapped / raw.length) * 100) : 100,
    timestamp: Date.now(),
  };
  return { rows: deduped, meta };
}

// ---------- Action Plan parser ----------

export async function parseActionPlanFile(
  file: File,
): Promise<{ rows: ActionPlanRow[]; meta: UploadMeta }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const { name: sheetName, ws } = pickSheet(wb, ["ACTION PLAN", "ACTIONPLAN", "PROGRAM", "DATA"]);
  const raw = sheetToCleanJson(ws);
  let mapped = 0;
  const seen = new Set<string>();
  const rows: ActionPlanRow[] = [];
  raw.forEach((r, idx) => {
    const pic = toStr(pick(r, ["NAMA", "PIC", "NAMA PIC"]));
    const cluster = toStr(pick(r, ["CLUSTER"]));
    const program = toStr(pick(r, ["PROGRAM", "NAMA PROGRAM"]));
    if (!program && !cluster) return;
    const startDate = toISODate(pick(r, ["START DATE", "TANGGAL MULAI", "START"]));
    const endDate = toISODate(pick(r, ["END DATE", "TANGGAL SELESAI", "END"]));
    const description = toStr(pick(r, ["KETERANGAN", "DESKRIPSI", "CATATAN"]));
    const key = `${pic}|${cluster}|${program}|${startDate}|${endDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    mapped++;
    const durationDays =
      startDate && endDate
        ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
        : 0;
    rows.push({
      id: `${idx}-${cluster}-${program}`.slice(0, 120),
      pic,
      cluster,
      program,
      startDate,
      endDate,
      description,
      status: statusWithOverdue(startDate, endDate),
      durationDays,
    });
  });
  const pics = new Set(rows.map((r) => r.pic).filter(Boolean));
  const clusters = new Set(rows.map((r) => r.cluster).filter(Boolean));
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: {
      Program: rows.length,
      PIC: pics.size,
      Cluster: clusters.size,
      Aktif: rows.filter((r) => r.status === "onprogress").length,
      Selesai: rows.filter((r) => r.status === "completed").length,
      Mendatang: rows.filter((r) => r.status === "planned").length,
      Terlambat: rows.filter((r) => r.status === "overdue").length,
    },
    mappingPct: raw.length ? Math.round((mapped / raw.length) * 100) : 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

// ---------- Smart Import: auto-detect kind ----------
export type ImportKind = "cluster" | "ticket" | "analyst" | "competitor" | "actionplan";
export type SmartResult =
  | { kind: "cluster"; rows: ClusterRow[]; meta: UploadMeta }
  | { kind: "ticket"; rows: TicketRow[]; meta: UploadMeta }
  | { kind: "analyst"; rows: AnalystRow[]; meta: UploadMeta }
  | { kind: "competitor"; rows: CompetitorRow[]; meta: UploadMeta }
  | { kind: "actionplan"; rows: ActionPlanRow[]; meta: UploadMeta };

function collectHeaders(wb: XLSX.WorkBook): string[] {
  const out: string[] = [];
  for (const n of wb.SheetNames) {
    const ws = wb.Sheets[n];
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
    for (let i = 0; i < Math.min(aoa.length, 5); i++) {
      for (const c of aoa[i] ?? []) out.push(norm(toStr(c)));
    }
    out.push(norm(n));
  }
  return out;
}

export function detectKind(wb: XLSX.WorkBook, fileName: string): ImportKind {
  const sheets = wb.SheetNames.map((s) => norm(s));
  const hs = collectHeaders(wb);
  const has = (needle: string) => hs.some((h) => h.includes(needle));

  // Action Plan: NAMA + CLUSTER + PROGRAM + START DATE + END DATE + KETERANGAN
  if (
    (has("program") || sheets.some((s) => s.includes("actionplan") || s.includes("actionpla"))) &&
    (has("startdate") || has("tanggalmulai")) &&
    (has("enddate") || has("tanggalselesai"))
  ) {
    return "actionplan";
  }

  // Competitor: NAMA KOMPETITOR + HARGA KOMPETITOR (TERMURAH) + PROMO
  if (
    has("namakompetitor") &&
    (has("hargakompetitortermurah") || has("hargakompetitor")) &&
    (has("promocompetitor") || has("promokompetitor"))
  ) {
    return "competitor";
  }
  if (sheets.some((s) => s.includes("kompetitor") || s.includes("competitor"))) {
    if (has("cluster") && (has("hargakompetitor") || has("namakompetitor"))) return "competitor";
  }

  // Analyst
  if (sheets.some((s) => s.includes("hasilprofiling") || s.includes("profiling"))) return "analyst";
  if (has("namaae") || has("insightae") || has("relokasifat") || has("tingkatpotensicluster")) return "analyst";

  // Cluster
  if (sheets.some((s) => s.includes("datacluster"))) return "cluster";
  if (has("provkabcluster") && (has("pic") || has("statusketersediaan"))) return "cluster";
  if (has("totalhc2026") || has("statusketersediaantimserpo") || has("statusketersediaantimikr")) return "cluster";

  // Ticket
  if (sheets.some((s) => s.includes("listticketing") || s.includes("ticket") || s.includes("pivot"))) return "ticket";
  if ((has("cluster") || has("wilayah") || has("kabupaten")) && (has("januari") || has("februari") || has("bulan"))) {
    return "ticket";
  }

  // Filename fallback
  const fn = norm(fileName);
  if (fn.includes("actionplan") || fn.includes("action")) return "actionplan";
  if (fn.includes("kompetitor") || fn.includes("competitor")) return "competitor";
  if (fn.includes("analyst")) return "analyst";
  if (fn.includes("cluster") || fn.includes("pembagian") || fn.includes("sibt")) return "cluster";
  return "ticket";
}

export async function smartImport(file: File): Promise<SmartResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const kind = detectKind(wb, file.name);
  if (kind === "cluster") { const r = await parseClusterFile(file); return { kind, ...r }; }
  if (kind === "analyst") { const r = await parseAnalystFile(file); return { kind, ...r }; }
  if (kind === "competitor") { const r = await parseCompetitorFile(file); return { kind, ...r }; }
  if (kind === "actionplan") { const r = await parseActionPlanFile(file); return { kind, ...r }; }
  const r = await parseTicketFile(file);
  return { kind: "ticket", ...r };
}

export async function classifyFile(
  file: File,
): Promise<{ kind: ImportKind; fileName: string; sheetName: string; sheetCount: number; size: number }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const kind = detectKind(wb, file.name);
  const preferred =
    kind === "cluster" ? ["DATA CLUSTER", "CLUSTER", "PEMBAGIAN"]
      : kind === "analyst" ? ["HASIL PROFILING", "PROFILING", "ANALYST"]
        : kind === "competitor" ? ["KOMPETITOR", "COMPETITOR", "DATA"]
          : kind === "actionplan" ? ["ACTION PLAN", "ACTIONPLAN", "PROGRAM", "DATA"]
            : ["TICKET", "DATA", "PIVOT"];
  const { name } = pickSheet(wb, preferred);
  return { kind, fileName: file.name, sheetName: name, sheetCount: wb.SheetNames.length, size: file.size };
}

export async function fileChecksum(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function exportToExcel<T extends Record<string, unknown>>(rows: T[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

export function downloadTemplate(kind: ImportKind) {
  const templates: Record<ImportKind, string[]> = {
    cluster: [
      "PROV/KAB/CLUSTER", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "Grand Total", "MEI.1", "JUNI.1", "DELTA MEI - JUNI", "ticket", "TOTAL HC 2026",
      "KABUPATEN/KOTA YG BENAR", "STATUS KETERSEDIAAN TIM SERPO",
      "STATUS KETERSEDIAAN TIM IKR", "Provinsi", "PIC",
    ],
    ticket: ["cluster", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "kategori", "penyebab", "status"],
    analyst: [
      "Timestamp", "Nama AE", "TANGGAL CANVASING & PROFILING", "CLUSTER",
      "SEBUTKAN KOMPETITOR YANG ADA DI SANA", "SEBUTKAN BERAPA HARGA RATA-RATA KOMPETITOR",
      "PROMO KOMPETITOR", "RATA-RATA USIA", "RATA-RATA PEKERJAAN", "KETERANGAN CLUSTER",
      "TINGKAT POTENSI CLUSTER", "ALASAN PENILAIAN POTENSI", "Status Tool Kits",
      "BUTUH PENAMBAHAN TOOLKITS", "STRATEGI PRODUK", "PRIORITAS BULAN DEPAN", "ALASAN",
      "RELOKASI FAT", "ALASAN RELOKASI", "KELUHAN", "SF/MI HARI INI", "CLOSE WON HARI INI",
      "TOTAL SF/MI", "MITRA BARU", "NAMA MITRA", "POTENSI MITRA", "STRATEGI PEMASARAN",
      "SEGMEN PELANGGAN", "DAYA BELI", "INSIGHT AE", "EVIDENCE",
    ],
    competitor: [
      "CLUSTER", "KABUPATEN", "PROVINSI", "NAMA KOMPETITOR",
      "HARGA KOMPETITOR TERMURAH", "PROMO COMPETITOR",
    ],
    actionplan: ["NAMA", "CLUSTER", "PROGRAM", "START DATE", "END DATE", "KETERANGAN"],
  };
  const headers = templates[kind];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  const sheetName =
    kind === "cluster" ? "DATA CLUSTER"
      : kind === "analyst" ? "HASIL PROFILING"
      : kind === "competitor" ? "KOMPETITOR"
      : kind === "actionplan" ? "ACTION PLAN"
      : "TICKET";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `template-${kind}.xlsx`);
}

