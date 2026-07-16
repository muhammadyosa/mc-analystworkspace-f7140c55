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

// ---------- Smart Import: auto-detect kind ----------
export type ImportKind = "cluster" | "ticket" | "analyst";
export type SmartResult =
  | { kind: "cluster"; rows: ClusterRow[]; meta: UploadMeta }
  | { kind: "ticket"; rows: TicketRow[]; meta: UploadMeta }
  | { kind: "analyst"; rows: AnalystRow[]; meta: UploadMeta };

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

  // Analyst: HASIL PROFILING sheet or profiling-specific columns
  if (sheets.some((s) => s.includes("hasilprofiling") || s.includes("profiling"))) return "analyst";
  if (has("namaae") || has("insightae") || has("relokasifat") || has("tingkatpotensicluster")) return "analyst";

  // Cluster: DATA CLUSTER sheet or PROV/KAB/CLUSTER header + PIC
  if (sheets.some((s) => s.includes("datacluster"))) return "cluster";
  if (has("provkabcluster") && (has("pic") || has("statusketersediaan"))) return "cluster";
  if (has("totalhc2026") || has("statusketersediaantimserpo") || has("statusketersediaantimikr")) return "cluster";

  // Ticket: pivot / list ticketing / has cluster+bulan and no PIC
  if (sheets.some((s) => s.includes("listticketing") || s.includes("ticket") || s.includes("pivot"))) return "ticket";
  if ((has("cluster") || has("wilayah") || has("kabupaten")) && (has("januari") || has("februari") || has("bulan"))) {
    return "ticket";
  }

  // Filename fallback
  const fn = norm(fileName);
  if (fn.includes("analyst")) return "analyst";
  if (fn.includes("cluster") || fn.includes("pembagian") || fn.includes("sibt")) return "cluster";
  return "ticket";
}

export async function smartImport(file: File): Promise<SmartResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const kind = detectKind(wb, file.name);
  // Re-parse via existing typed parsers (they re-read the file, negligible cost)
  if (kind === "cluster") {
    const r = await parseClusterFile(file);
    return { kind, ...r };
  }
  if (kind === "analyst") {
    const r = await parseAnalystFile(file);
    return { kind, ...r };
  }
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
    kind === "cluster"
      ? ["DATA CLUSTER", "CLUSTER", "PEMBAGIAN"]
      : kind === "analyst"
        ? ["HASIL PROFILING", "PROFILING", "ANALYST"]
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

export function downloadTemplate(kind: "cluster" | "ticket" | "analyst") {
  const templates: Record<string, string[]> = {
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
  };
  const headers = templates[kind];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, kind === "cluster" ? "DATA CLUSTER" : kind === "analyst" ? "HASIL PROFILING" : "TICKET");
  XLSX.writeFile(wb, `template-${kind}.xlsx`);
}
