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
      { name: "CLUSTER", aliases: ["NAMA CLUSTER"], example: "CLUSTER BANDUNG KOTA", required: true },
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
