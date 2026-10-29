import * as XLSX from "xlsx";

const workbookReads = new WeakMap<File, Promise<XLSX.WorkBook>>();
function readWorkbook(file: File) {
  let read = workbookReads.get(file);
  if (!read) {
    read = file.arrayBuffer().then((buffer) => XLSX.read(buffer, { type: "array" }));
    workbookReads.set(file, read);
    read.catch(() => workbookReads.delete(file));
  }
  return read;
}

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
  juli: number;
  agustus: number;
  september: number;
  oktober: number;
  november: number;
  desember: number;
  grandTotal: number;
  mei1: number;
  juni1: number;
  deltaMeiJuni: number;
  ticket: number;
  totalHC2026: number;
  serpoStatus: string;
  ikrStatus: string;
  // Kolom tambahan dari template cluster terbaru (opsional pada file lama)
  homepass: number;
  hcTerpasang: number;
  hcAktif: number;
  available: number;
  turHC: number;
  turHCAktif: number;
  churn: number;
  totalNewHC: number;
  newHCByMonth: Record<string, number>;
  ticketByMonth: Record<string, number>;
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
  serviceType?: string;
  speedMbps?: number | null;
  installationCost?: number | null;
  promoStart?: string;
  promoEnd?: string;
  iconnetPrice?: number | null;
  iconnetSpeedMbps?: number | null;
  iconnetInstallationCost?: number | null;
  iconnetPromo?: string;
  updatedAt?: string;
};

export type PromoCategory =
  | "Gratis Instalasi"
  | "Diskon Instalasi"
  | "Upgrade Kecepatan"
  | "Cashback"
  | "Bundling"
  | "Tidak Ada Promo"
  | "Lainnya";

export type ActionPlanStatus = "planned" | "onprogress" | "completed" | "overdue" | "reschedule";
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
  updatedAt?: string;
  statusManual?: boolean;
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
  const s = String(v)
    .replace(/[,\s]/g, "")
    .replace(/[^\d.\-]/g, "");
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
    } catch {
      /* fall through */
    }
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

export function computeActionStatus(
  startISO: string,
  endISO: string,
  result?: string,
): ActionPlanStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = startISO ? new Date(startISO) : null;
  const e = endISO ? new Date(endISO) : null;
  const hasResult = !!(result && result.trim());
  if (s && s > today) return "planned";
  if (e && e < today) return hasResult ? "completed" : "overdue";
  if (s && e && s <= today && today <= e) return "onprogress";
  if (hasResult) return "completed";
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
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });
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

const MONTH_KEYS = [
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
] as const;
type MonthName = (typeof MONTH_KEYS)[number];

const monthFromNumber = (n: number): MonthName | null =>
  Number.isInteger(n) && n >= 1 && n <= 12 ? MONTH_KEYS[n - 1] : null;

/**
 * Deteksi bulan dari satu potongan header, fleksibel terhadap banyak format:
 * "Sep", "SEPT", "September", "Sep 2026", "2026-09", "09/2026", "9".
 * Dipakai bersama oleh kolom HC, NEW HC, dan TICKET/TIKET sehingga bulan baru
 * pada file Excel langsung terbaca tanpa perubahan kode.
 */
export function monthFromToken(token: string): MonthName | null {
  const t = token.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!t) return null;

  if (/^\d+$/.test(t)) {
    if (t.length <= 2) return monthFromNumber(Number(t));
    if (t.length === 6) {
      if (/^20\d{4}$/.test(t)) return monthFromNumber(Number(t.slice(4)));
      if (/^\d{2}20\d{2}$/.test(t)) return monthFromNumber(Number(t.slice(0, 2)));
    }
    return null;
  }

  const letters = t.replace(/[0-9]/g, "");
  if (!letters) return null;
  for (const key of MONTH_KEYS) {
    const aliases = BULAN_ALIASES[key.toUpperCase()] ?? [];
    if (aliases.some((a) => letters === a || letters.startsWith(a) || letters.endsWith(a)))
      return key;
  }
  return null;
}

/** Sinonim awalan kolom pada berbagai versi template. */
const COL_PREFIXES: Record<string, string[]> = {
  hcaktif: ["hcaktif", "hcactive", "hc"],
  newhc: ["newhc", "hcbaru"],
  ticket: ["ticket", "tiket", "tkt"],
};

/**
 * Cari kolom bulan pada header untuk kelompok kolom tertentu
 * ("hcaktif" | "newhc" | "ticket"), atau "" untuk kolom bulan polos.
 * Kolom total/grand/delta diabaikan, dan hanya kolom pertama tiap bulan dipakai
 * (menghindari kolom duplikat hasil dedupe: "HC AKTIF JUNI_2").
 */
function monthColumnMap(headers: string[], group: string, strict = false): Record<string, string> {
  const out: Record<string, string> = {};
  const prefixes = group ? (COL_PREFIXES[group] ?? [group]) : [""];
  const resolve = strict ? monthFromTokenStrict : monthFromToken;
  for (const h of headers) {
    const n = norm(h);
    if (!n || n.includes("total") || n.includes("grand") || n.includes("delta")) continue;
    // Jangan sampai kolom NEW HC / TICKET terbaca sebagai HC aktif.
    if (group === "hcaktif" && /^(newhc|hcbaru|ticket|tiket|tkt)/.test(n)) continue;
    let rest: string | null = null;
    for (const p of prefixes) {
      if (!p) {
        rest = n;
        break;
      }
      if (n.startsWith(p)) {
        rest = n.slice(p.length);
        break;
      }
    }
    if (rest === null || (group && !rest)) continue;
    const key = resolve(rest);
    if (key && !out[key]) out[key] = h;
  }
  return out;
}

/**
 * Versi ketat: nama bulan harus persis salah satu alias (setelah tahun dibuang),
 * dipakai untuk kolom bulan polos ("Sep", "AGUSTUS", "2026-09") agar kolom lain
 * seperti "PROVINSI" tidak salah dikenali sebagai bulan.
 */
function monthFromTokenStrict(token: string): MonthName | null {
  const t = token.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!t) return null;
  if (/^\d+$/.test(t)) return monthFromToken(t);
  const letters = t.replace(/20\d\d/g, "").replace(/[0-9]/g, "");
  if (!letters) return null;
  for (const key of MONTH_KEYS) {
    if ((BULAN_ALIASES[key.toUpperCase()] ?? []).includes(letters)) return key;
  }
  return null;
}

const emptyMonths = (): Record<string, number> =>
  Object.fromEntries(MONTH_KEYS.map((m) => [m, 0])) as Record<string, number>;

export async function parseClusterFile(
  file: File,
): Promise<{ rows: ClusterRow[]; meta: UploadMeta }> {
  const wb = await readWorkbook(file);
  const { name: sheetName, ws } = pickSheet(wb, [
    "RAW DATA CLUSTER",
    "DATA CLUSTER",
    "CLUSTER",
    "PEMBAGIAN",
  ]);
  const raw = sheetToCleanJson(ws);
  const headers = raw.length ? Object.keys(raw[0]) : [];

  // Template baru: "HC AKTIF <BULAN>", "NEW HC <BULAN>", "Ticket <BULAN>".
  // Template lama / campuran: kolom bulan polos ("JANUARI", "Sep", "2026-09").
  // Keduanya digabung supaya bulan baru yang ditulis polos tetap terbaca.
  const hcCols: Record<string, string> = {
    ...monthColumnMap(headers, "", true),
    ...monthColumnMap(headers, "hcaktif"),
  };
  const newHcCols = monthColumnMap(headers, "newhc");
  const ticketCols = monthColumnMap(headers, "ticket");

  // Bulan terbaru yang muncul di file (dari kolom HC / NEW HC / TICKET).
  // Kalau bulan itu belum punya kolom HC sendiri, pakai snapshot "HC Aktif".
  const tracked = MONTH_KEYS.filter((m) => hcCols[m] || newHcCols[m] || ticketCols[m]);
  const latestTracked = tracked[tracked.length - 1];
  const snapshotMonth = latestTracked && !hcCols[latestTracked] ? latestTracked : null;

  let mapped = 0;
  const rows = raw
    .map((r, idx): ClusterRow | null => {
      const cluster = toStr(pick(r, ["PROV/KAB/CLUSTER", "CLUSTER", "OLT", "cluster"]));
      if (!cluster) return null;
      if (/^(grand\s*)?total$/i.test(cluster)) return null;
      mapped++;

      const hc = emptyMonths();
      const newHC = emptyMonths();
      const ticketM = emptyMonths();
      for (const m of MONTH_KEYS) {
        if (hcCols[m]) hc[m] = toNum(r[hcCols[m]]);
        if (newHcCols[m]) newHC[m] = toNum(r[newHcCols[m]]);
        if (ticketCols[m]) ticketM[m] = toNum(r[ticketCols[m]]);
      }

      const homepass = toNum(pick(r, ["Homepass", "HOMEPASS"]));
      const hcAktif = toNum(pick(r, ["HC Aktif", "HC AKTIF"]));
      if (snapshotMonth && hcAktif > 0 && !hc[snapshotMonth]) hc[snapshotMonth] = hcAktif;
      const filledMonths = MONTH_KEYS.filter((m) => hc[m] > 0);
      const lastM = filledMonths[filledMonths.length - 1];
      const prevM = filledMonths[filledMonths.length - 2];
      const deltaCol = toNum(
        pick(r, ["DELTA HC AKTIF", "DELTA MEI - JUNI", "DELTA MEI-JUNI", "DELTA"]),
      );
      const delta = lastM && prevM ? hc[lastM] - hc[prevM] : deltaCol;

      const totalTicket =
        toNum(pick(r, ["Total Ticket", "TOTAL TICKET", "ticket", "TICKET"])) ||
        MONTH_KEYS.reduce((a, m) => a + ticketM[m], 0);
      const target = toNum(pick(r, ["TOTAL HC 2026"])) || homepass || toNum(pick(r, ["TOTAL HC"]));

      return {
        id: `${idx}-${cluster}`,
        cluster,
        kabupaten: toStr(pick(r, ["KABUPATEN/KOTA YG BENAR", "Kabupaten/Kota", "kabupaten"])),
        provinsi: toStr(pick(r, ["PROVINSI", "Provinsi", "provinsi"])),
        pic: toStr(pick(r, ["PIC"])),
        januari: hc.januari,
        februari: hc.februari,
        maret: hc.maret,
        april: hc.april,
        mei: hc.mei,
        juni: hc.juni || (lastM ? hc[lastM] : hcAktif),
        juli: hc.juli,
        agustus: hc.agustus,
        september: hc.september,
        oktober: hc.oktober,
        november: hc.november,
        desember: hc.desember,
        grandTotal:
          toNum(pick(r, ["Grand Total HC Aktif", "Grand Total", "GRAND TOTAL"])) ||
          MONTH_KEYS.reduce((a, m) => a + hc[m], 0),
        mei1: toNum(pick(r, ["MEI_2", "MEI.1", "MEI 1"])),
        juni1: toNum(pick(r, ["JUNI_2", "JUNI.1", "JUNI 1"])),
        deltaMeiJuni: delta,
        ticket: totalTicket,
        totalHC2026: target,
        serpoStatus: toStr(pick(r, ["STATUS KETERSEDIAAN TIM SERPO", "SERPO"])),
        ikrStatus: toStr(pick(r, ["STATUS KETERSEDIAAN TIM IKR", "IKR"])),
        homepass,
        hcTerpasang: toNum(pick(r, ["HC Terpasang"])),
        hcAktif: hcAktif || (lastM ? hc[lastM] : 0),
        available: toNum(pick(r, ["Available"])),
        turHC: toNum(pick(r, ["TUR HC"])),
        turHCAktif: toNum(pick(r, ["TUR HC Aktif"])),
        churn: toNum(pick(r, ["Churn"])),
        totalNewHC:
          toNum(pick(r, ["Total New HC 2026", "Total New HC"])) ||
          MONTH_KEYS.reduce((a, m) => a + newHC[m], 0),
        newHCByMonth: newHC,
        ticketByMonth: ticketM,
      };
    })
    .filter((r): r is ClusterRow => r !== null);

  const kab = new Set(rows.map((r) => r.kabupaten).filter(Boolean));
  const prov = new Set(rows.map((r) => r.provinsi).filter(Boolean));
  const monthsFound = MONTH_KEYS.filter((m) =>
    rows.some((r) => (r as unknown as Record<string, number>)[m] > 0),
  );
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: {
      Cluster: rows.length,
      Kabupaten: kab.size,
      Provinsi: prov.size,
      Bulan: monthsFound.length,
      "Total Ticket": rows.reduce((a, r) => a + r.ticket, 0),
    },
    mappingPct: raw.length ? Math.round((mapped / raw.length) * 100) : 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

// Aliases per bulan (normalized, tanpa spasi/tanda baca). Header seperti
// "Ticket Jan", "TICKET AGST", "Juni 2026" tetap terdeteksi.
const BULAN_ALIASES: Record<string, string[]> = {
  JANUARI: ["januari", "januar", "jan"],
  FEBRUARI: ["februari", "pebruari", "feb"],
  MARET: ["maret", "march", "mar"],
  APRIL: ["april", "apr"],
  MEI: ["mei", "may"],
  JUNI: ["juni", "june", "jun"],
  JULI: ["juli", "july", "jul"],
  AGUSTUS: ["agustus", "august", "agst", "agus", "agu", "ags", "agt", "aug"],
  SEPTEMBER: ["september", "sept", "sep"],
  OKTOBER: ["oktober", "october", "okt", "oct"],
  NOVEMBER: ["november", "nop", "nov"],
  DESEMBER: ["desember", "december", "des", "dec"],
};

// Petakan satu header kolom -> nama bulan kanonik (abaikan total/grand total/blank)
function monthOfHeader(h: string): string | null {
  const n = norm(h);
  if (!n) return null;
  if (n.includes("total") || n.includes("grand") || n.includes("blank") || n.includes("cluster"))
    return null;
  const stripped = n.replace(/ticket|tiket|jumlah|count|bulan/g, "");
  if (!stripped) return null;
  const key = monthFromToken(stripped) ?? monthFromToken(stripped.replace(/20\d\d/g, ""));
  return key ? key.toUpperCase() : null;
}

type TicketLayout = {
  headerIdx: number;
  labelCol: number;
  months: { col: number; bulan: string }[];
  dataRows: number;
};

/**
 * Deteksi layout pivot ticket: header bisa berada di baris ke-n (sheet pivot
 * Excel biasanya diawali baris filter seperti "penyebab | (Multiple Items)").
 */
function detectTicketLayout(aoa: unknown[][]): TicketLayout | null {
  let best: TicketLayout | null = null;
  const limit = Math.min(aoa.length, 20);
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] ?? [];
    const months: { col: number; bulan: string }[] = [];
    const used = new Set<string>();
    row.forEach((c, ci) => {
      const b = monthOfHeader(toStr(c));
      if (b && !used.has(b)) {
        used.add(b);
        months.push({ col: ci, bulan: b });
      }
    });
    if (months.length < 2) continue;
    const firstMonthCol = months[0].col;
    let labelCol = 0;
    for (let ci = 0; ci < firstMonthCol; ci++) {
      if (toStr(row[ci]) !== "") {
        labelCol = ci;
        break;
      }
    }
    const dataRows = aoa.length - i - 1;
    if (!best || months.length > best.months.length) {
      best = { headerIdx: i, labelCol, months, dataRows };
    }
  }
  return best;
}

const isClusterLabel = (s: string) => /olt|fh\.|ma5|odc|rit[\s.\-]/i.test(s);

/** Pilih sheet ticket terbaik: paling banyak kolom bulan, lalu paling banyak baris. */
function pickTicketSheet(wb: XLSX.WorkBook): {
  name: string;
  aoa: unknown[][];
  layout: TicketLayout | null;
} {
  let best: { name: string; aoa: unknown[][]; layout: TicketLayout | null; score: number } | null =
    null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    if (!aoa.length) continue;
    const layout = detectTicketLayout(aoa);
    if (!layout) continue;
    const clusterRows = aoa
      .slice(layout.headerIdx + 1)
      .filter((r) => isClusterLabel(toStr(r?.[layout.labelCol]))).length;
    const score = layout.months.length * 100000 + clusterRows;
    if (!best || score > best.score) best = { name, aoa, layout, score };
  }
  if (best) return { name: best.name, aoa: best.aoa, layout: best.layout };
  const { name, ws } = pickSheet(wb, ["TICKET", "DATA", "PIVOT"]);
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  return { name, aoa, layout: null };
}

export async function parseTicketFile(
  file: File,
): Promise<{ rows: TicketRow[]; meta: UploadMeta }> {
  const wb = await readWorkbook(file);
  const { name: sheetName, aoa, layout } = pickTicketSheet(wb);

  const rows: TicketRow[] = [];

  if (layout) {
    const body = aoa.slice(layout.headerIdx + 1);
    const labels = body.map((r) => toStr(r?.[layout.labelCol]));
    const hasClusterRows = labels.some((l) => isClusterLabel(l));
    const seen = new Set<string>();
    body.forEach((r, i) => {
      const cluster = labels[i];
      if (!cluster) return;
      if (/^\(?(grand\s*)?total\)?$/i.test(cluster)) return;
      // Sheet pivot memuat baris agregat (provinsi/kabupaten) + baris cluster.
      // Ambil hanya baris cluster agar tidak dobel hitung.
      if (hasClusterRows && !isClusterLabel(cluster)) return;
      const key = cluster.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      for (const { col, bulan } of layout.months) {
        const v = r?.[col];
        if (v === undefined || v === null || v === "") continue;
        rows.push({ cluster, bulan, ticket: toNum(v), kategori: "", penyebab: "", status: "" });
      }
    });
  } else {
    // Tabel biasa (bukan pivot)
    const raw = sheetToCleanJson(wb.Sheets[sheetName]);
    for (const r of raw) {
      const cluster = toStr(
        pick(r, ["cluster", "idolt", "olt", "wilayah", "kabupaten", "area", "PROV/KAB/CLUSTER"]),
      );
      if (!cluster) continue;
      if (/^(grand\s*)?total$/i.test(cluster)) continue;
      const ticket = toNum(pick(r, ["ticket", "jumlah", "count", "total"]));
      const bulan = toStr(pick(r, ["bulan", "month"]));
      rows.push({
        cluster,
        bulan,
        ticket: ticket || 1,
        kategori: toStr(pick(r, ["kategori", "category"])),
        penyebab: toStr(pick(r, ["penyebab", "cause", "root cause"])),
        status: toStr(pick(r, ["status"])),
      });
    }
  }

  const clusters = new Set(rows.map((r) => r.cluster));
  const monthsFound = Array.from(new Set(rows.map((r) => r.bulan).filter(Boolean)));
  const total = rows.reduce((a, r) => a + r.ticket, 0);
  const meta: UploadMeta = {
    fileName: file.name,
    sheetCount: wb.SheetNames.length,
    sheetPicked: sheetName,
    rowCount: rows.length,
    extra: {
      Cluster: clusters.size,
      Bulan: monthsFound.length,
      "Total Ticket": total,
      Records: rows.length,
    },
    mappingPct: 100,
    timestamp: Date.now(),
  };
  return { rows, meta };
}

export async function parseAnalystFile(
  file: File,
): Promise<{ rows: AnalystRow[]; meta: UploadMeta }> {
  const wb = await readWorkbook(file);
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
        competitorPrice: toNum(
          pick(r, ["SEBUTKAN BERAPA HARGA RATA-RATA KOMPETITOR", "HARGA RATA-RATA KOMPETITOR"]),
        ),
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
  {
    cat: "Gratis Instalasi",
    kws: ["gratis instal", "free instal", "instalasi gratis", "bebas instal"],
  },
  {
    cat: "Diskon Instalasi",
    kws: ["diskon instal", "diskon biaya instal", "disc instal", "potongan instal"],
  },
  {
    cat: "Upgrade Kecepatan",
    kws: ["upgrade kecepatan", "upgrade speed", "tambah kecepatan", "double speed"],
  },
  { cat: "Cashback", kws: ["cashback", "cash back"] },
  { cat: "Bundling", kws: ["bundling", "bundle", "paket"] },
];

export function categorizePromo(raw: string): PromoCategory {
  const s = raw.trim().toLowerCase();
  if (
    !s ||
    s === "-" ||
    s === "tidak ada" ||
    s.includes("tidak ada promo") ||
    s === "none" ||
    s === "no"
  ) {
    return "Tidak Ada Promo";
  }
  for (const r of PROMO_RULES) if (r.kws.some((k) => s.includes(k))) return r.cat;
  return "Lainnya";
}

export async function parseCompetitorFile(
  file: File,
): Promise<{ rows: CompetitorRow[]; meta: UploadMeta }> {
  const wb = await readWorkbook(file);
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
      pick(r, ["HARGA KOMPETITOR TERMURAH", "HARGA KOMPETITOR", "HARGA TERMURAH", "HARGA"]),
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
        serviceType: toStr(pick(r, ["JENIS LAYANAN", "SERVICE TYPE"])),
        speedMbps: toStr(pick(r, ["KECEPATAN MBPS", "SPEED MBPS"]))
          ? toNum(pick(r, ["KECEPATAN MBPS", "SPEED MBPS"]))
          : null,
        installationCost: toStr(pick(r, ["BIAYA INSTALASI", "INSTALLATION COST"]))
          ? toNum(pick(r, ["BIAYA INSTALASI", "INSTALLATION COST"]))
          : null,
        promoStart: toISODate(pick(r, ["MULAI PROMO"])),
        promoEnd: toISODate(pick(r, ["AKHIR PROMO"])),
        iconnetPrice: toStr(pick(r, ["HARGA ICONNET"])) ? toNum(pick(r, ["HARGA ICONNET"])) : null,
        iconnetSpeedMbps: toStr(pick(r, ["KECEPATAN ICONNET MBPS"]))
          ? toNum(pick(r, ["KECEPATAN ICONNET MBPS"]))
          : null,
        iconnetInstallationCost: toStr(pick(r, ["BIAYA INSTALASI ICONNET"]))
          ? toNum(pick(r, ["BIAYA INSTALASI ICONNET"]))
          : null,
        iconnetPromo: toStr(pick(r, ["PROMO ICONNET"])),
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
  const wb = await readWorkbook(file);
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
    const result = toStr(pick(r, ["HASIL", "OUTCOME", "RESULT", "HASIL PROGRAM"]));
    const key = `${pic}|${cluster}|${program}|${startDate}|${endDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    mapped++;
    const durationDays =
      startDate && endDate
        ? Math.max(
            1,
            Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) +
              1,
          )
        : 0;
    rows.push({
      id: `${idx}-${cluster}-${program}`.slice(0, 120),
      pic,
      cluster,
      program,
      startDate,
      endDate,
      description,
      result,
      status: computeActionStatus(startDate, endDate, result),
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
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });
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

  // Action Plan: NAMA + CLUSTER + PROGRAM + START DATE + END DATE + KETERANGAN + Hasil
  if (
    (has("program") || sheets.some((s) => s.includes("actionplan") || s.includes("actionpla"))) &&
    (has("startdate") || has("tanggalmulai")) &&
    (has("enddate") || has("tanggalselesai") || has("hasil"))
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
  if (has("namaae") || has("insightae") || has("relokasifat") || has("tingkatpotensicluster"))
    return "analyst";

  // Cluster
  if (sheets.some((s) => s.includes("datacluster"))) return "cluster";
  if (has("provkabcluster") && (has("pic") || has("statusketersediaan"))) return "cluster";
  if (has("totalhc2026") || has("statusketersediaantimserpo") || has("statusketersediaantimikr"))
    return "cluster";
  if (has("hcterpasang") || has("homepass") || has("totalnewhc2026") || has("grandtotalhcaktif"))
    return "cluster";

  // Ticket
  if (
    sheets.some((s) => s.includes("listticketing") || s.includes("ticket") || s.includes("pivot"))
  )
    return "ticket";
  if (
    (has("cluster") || has("wilayah") || has("kabupaten")) &&
    (has("januari") || has("februari") || has("bulan"))
  ) {
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
  const wb = await readWorkbook(file);
  const kind = detectKind(wb, file.name);
  if (kind === "cluster") {
    const r = await parseClusterFile(file);
    return { kind, ...r };
  }
  if (kind === "analyst") {
    const r = await parseAnalystFile(file);
    return { kind, ...r };
  }
  if (kind === "competitor") {
    const r = await parseCompetitorFile(file);
    return { kind, ...r };
  }
  if (kind === "actionplan") {
    const r = await parseActionPlanFile(file);
    return { kind, ...r };
  }
  const r = await parseTicketFile(file);
  return { kind: "ticket", ...r };
}

export async function classifyFile(file: File): Promise<{
  kind: ImportKind;
  fileName: string;
  sheetName: string;
  sheetCount: number;
  size: number;
}> {
  const wb = await readWorkbook(file);
  const kind = detectKind(wb, file.name);
  const preferred =
    kind === "cluster"
      ? ["DATA CLUSTER", "CLUSTER", "PEMBAGIAN"]
      : kind === "analyst"
        ? ["HASIL PROFILING", "PROFILING", "ANALYST"]
        : kind === "competitor"
          ? ["KOMPETITOR", "COMPETITOR", "DATA"]
          : kind === "actionplan"
            ? ["ACTION PLAN", "ACTIONPLAN", "PROGRAM", "DATA"]
            : ["TICKET", "DATA", "PIVOT"];
  const { name } = pickSheet(wb, preferred);
  return {
    kind,
    fileName: file.name,
    sheetName: name,
    sheetCount: wb.SheetNames.length,
    size: file.size,
  };
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
      "CLUSTER",
      "Homepass",
      "HC Terpasang",
      "HC Aktif",
      "Available",
      "TUR HC",
      "TUR HC Aktif",
      "PIC",
      "Churn",
      "NEW HC JANUARI",
      "NEW HC FEBRUARI",
      "NEW HC MARET",
      "NEW HC APRIL",
      "NEW HC MEI",
      "NEW HC JUNI",
      "NEW HC JULI",
      "NEW HC AGST",
      "Total New HC 2026",
      "HC AKTIF JANUARI",
      "HC AKTIF FEBRUARI",
      "HC AKTIF MARET",
      "HC AKTIF APRIL",
      "HC AKTIF MEI",
      "HC AKTIF JUNI",
      "HC AKTIF JULI",
      "HC AKTIF AGST",
      "Grand Total HC Aktif",
      "Ticket Jan",
      "Ticket Feb",
      "Ticket Maret",
      "Ticket April",
      "Ticket Mei",
      "Ticket Juni",
      "Ticket Juli",
      "TICKET AGST",
      "Total Ticket",
      "Kabupaten/Kota",
      "IKR",
      "SERPO",
      "PROVINSI",
    ],

    ticket: [
      "CLUSTER",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agt",
      "Sep",
      "Okt",
      "Nov",
      "Des",
      "Grand Total",
    ],
    analyst: [
      "Timestamp",
      "Nama AE",
      "TANGGAL CANVASING & PROFILING",
      "CLUSTER",
      "SEBUTKAN KOMPETITOR YANG ADA DI SANA",
      "SEBUTKAN BERAPA HARGA RATA-RATA KOMPETITOR",
      "PROMO KOMPETITOR",
      "RATA-RATA USIA",
      "RATA-RATA PEKERJAAN",
      "KETERANGAN CLUSTER",
      "TINGKAT POTENSI CLUSTER",
      "ALASAN PENILAIAN POTENSI",
      "Status Tool Kits",
      "BUTUH PENAMBAHAN TOOLKITS",
      "STRATEGI PRODUK",
      "PRIORITAS BULAN DEPAN",
      "ALASAN",
      "RELOKASI FAT",
      "ALASAN RELOKASI",
      "KELUHAN",
      "SF/MI HARI INI",
      "CLOSE WON HARI INI",
      "TOTAL SF/MI",
      "MITRA BARU",
      "NAMA MITRA",
      "POTENSI MITRA",
      "STRATEGI PEMASARAN",
      "SEGMEN PELANGGAN",
      "DAYA BELI",
      "INSIGHT AE",
      "EVIDENCE",
    ],
    competitor: [
      "CLUSTER",
      "KABUPATEN",
      "PROVINSI",
      "NAMA KOMPETITOR",
      "HARGA KOMPETITOR TERMURAH",
      "PROMO COMPETITOR",
      "JENIS LAYANAN",
      "KECEPATAN MBPS",
      "BIAYA INSTALASI",
      "MULAI PROMO",
      "AKHIR PROMO",
      "HARGA ICONNET",
      "KECEPATAN ICONNET MBPS",
      "BIAYA INSTALASI ICONNET",
      "PROMO ICONNET",
    ],
    actionplan: ["NAMA", "CLUSTER", "PROGRAM", "START DATE", "END DATE", "KETERANGAN", "Hasil"],
  };
  const headers = templates[kind];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  const sheetName =
    kind === "cluster"
      ? "DATA CLUSTER"
      : kind === "analyst"
        ? "HASIL PROFILING"
        : kind === "competitor"
          ? "KOMPETITOR"
          : kind === "actionplan"
            ? "ACTION PLAN"
            : "TICKET";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `template-${kind}.xlsx`);
}
