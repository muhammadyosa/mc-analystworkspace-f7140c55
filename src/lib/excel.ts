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
  wilayah: string;
  cluster?: string;
  januari: number;
  februari: number;
  maret: number;
  april: number;
  mei: number;
  juni: number;
  total: number;
};

const toNum = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).replace(/[,\s]/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

const toStr = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

// Fuzzy header matcher
const findKey = (row: Record<string, unknown>, patterns: string[]): string | null => {
  const keys = Object.keys(row);
  for (const p of patterns) {
    const found = keys.find((k) => k.toLowerCase().replace(/\s+/g, "").includes(p.toLowerCase().replace(/\s+/g, "")));
    if (found) return found;
  }
  return null;
};

export async function parseClusterFile(file: File): Promise<ClusterRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return rows
    .map((r, idx): ClusterRow | null => {
      const clusterKey = findKey(r, ["PROV/KAB/CLUSTER", "cluster"]);
      const kabKey = findKey(r, ["KABUPATEN/KOTA YG BENAR", "kabupaten"]);
      const provKey = findKey(r, ["Provinsi", "provinsi"]);
      const picKey = findKey(r, ["PIC"]);
      const cluster = toStr(clusterKey ? r[clusterKey] : "");
      if (!cluster) return null;
      return {
        id: `${idx}-${cluster}`,
        cluster,
        kabupaten: toStr(kabKey ? r[kabKey] : ""),
        provinsi: toStr(provKey ? r[provKey] : ""),
        pic: toStr(picKey ? r[picKey] : ""),
        januari: toNum(r["JANUARI"]),
        februari: toNum(r["FEBRUARI"]),
        maret: toNum(r["MARET"]),
        april: toNum(r["APRIL"]),
        mei: toNum(r["MEI"]),
        juni: toNum(r["JUNI"]),
        grandTotal: toNum(r["Grand Total"] ?? r["GRAND TOTAL"]),
        mei1: toNum(r["MEI.1"] ?? r["MEI 1"]),
        juni1: toNum(r["JUNI.1"] ?? r["JUNI 1"]),
        deltaMeiJuni: toNum(r["DELTA MEI - JUNI"] ?? r["DELTA MEI-JUNI"]),
        ticket: toNum(r["ticket"] ?? r["TICKET"] ?? r["Ticket"]),
        totalHC2026: toNum(r["TOTAL HC 2026"]),
        serpoStatus: toStr(r["STATUS KETERSEDIAAN TIM SERPO"]),
        ikrStatus: toStr(r["STATUS KETERSEDIAAN TIM IKR"]),
      };
    })
    .filter((r): r is ClusterRow => r !== null);
}

export async function parseTicketFile(file: File): Promise<TicketRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return rows
    .map((r): TicketRow | null => {
      const wilKey = findKey(r, ["wilayah", "cluster", "kabupaten", "area"]);
      const wilayah = toStr(wilKey ? r[wilKey] : "");
      if (!wilayah) return null;
      const jan = toNum(r["JANUARI"] ?? r["Januari"] ?? r["jan"]);
      const feb = toNum(r["FEBRUARI"] ?? r["Februari"] ?? r["feb"]);
      const mar = toNum(r["MARET"] ?? r["Maret"] ?? r["mar"]);
      const apr = toNum(r["APRIL"] ?? r["April"] ?? r["apr"]);
      const mei = toNum(r["MEI"] ?? r["Mei"] ?? r["may"]);
      const jun = toNum(r["JUNI"] ?? r["Juni"] ?? r["jun"]);
      return {
        wilayah,
        januari: jan,
        februari: feb,
        maret: mar,
        april: apr,
        mei,
        juni: jun,
        total: jan + feb + mar + apr + mei + jun,
      };
    })
    .filter((r): r is TicketRow => r !== null);
}

export function exportToExcel<T extends Record<string, unknown>>(rows: T[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}
