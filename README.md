# Insight Spark

PROMPT APLIKASI WEB MARKET & CONSUMER ANALYST WORKSPACE

Buat aplikasi web enterprise modern berbasis:

 React 19

 TypeScript

 Tailwind CSS

 Shadcn/UI

 Recharts

 Framer Motion

 Lucide React Icons

 XLSX Import/Export

 Local Storage + IndexedDB

 Responsive Desktop & Mobile

 Dark Mode & Light Mode

Nama Aplikasi

Market & Consumer Analyst Workspace

Subtitle:

Intelligent Cluster Analysis & Strategy Management Platform

DATA SOURCE

Aplikasi harus dapat upload file Excel secara drag & drop.

File 1

PEMBAGIAN CLUSTER SIBT.xlsx

Kolom yang tersedia:

PROV/KAB/CLUSTER
JANUARI
FEBRUARI
MARET
APRIL
MEI
JUNI
Grand Total
MEI.1
JUNI.1
DELTA MEI - JUNI
ticket
TOTAL HC 2026
KABUPATEN/KOTA YG BENAR
STATUS KETERSEDIAAN TIM SERPO
STATUS KETERSEDIAAN TIM IKR
Provinsi
PIC

File 2

ticket jan-jun.xlsx

Data ticket per wilayah.

Gunakan untuk:

 Trend Ticket

 Ticket Growth

 Top Ticket Cluster

 High Risk Cluster

 Customer Loyalty Analysis

DASHBOARD OVERVIEW

Buat dashboard executive modern seperti Power BI.

KPI CARDS

Menampilkan:

Cluster

 Total Cluster

 Total Kabupaten

 Total Provinsi

HC

 Total HC

 HC Growth

 HC Bulan Ini

 HC Bulan Sebelumnya

Ticket

 Total Ticket

 Ticket Growth

 High Risk Cluster

Progress

 Cluster Prioritas

 Action Plan Aktif

 Cycle Completed

Executive Summary AI

Generate otomatis:

Contoh:

HC mengalami pertumbuhan +4.5% dibanding bulan sebelumnya.

Cluster dengan penurunan terbesar:
- Paguyaman
- Limboto
- Boroko

Ticket tertinggi terdapat pada cluster:
- Kota Gorontalo
- Boroko
- Limboto

Fokus pekerjaan minggu ini:
1. Retention Program
2. Site Visit
3. Analisa Kompetitor

VISUALISASI

HC Trend

Line Chart

Menampilkan:

JANUARI
FEBRUARI
MARET
APRIL
MEI
JUNI

Per Cluster.

Top HC Cluster

Bar Chart

Top 10 HC tertinggi.

HC Growth

Bar Chart

Menggunakan:

DELTA MEI - JUNI

Warna:

Hijau:

Delta > 0

Merah:

Delta < 0

Ticket Analysis

Menggunakan data:

ticket

Menampilkan:

 Ticket Tertinggi

 Ticket Terendah

 Ticket Trend

Province Distribution

Pie Chart

Berdasarkan:

Provinsi

PIC Performance

Ranking PIC berdasarkan:

 Total HC

 Growth HC

 Ticket

 Jumlah Cluster

MASTER CLUSTER

Tabel interaktif seperti DataTable.

Fitur:

 Search

 Filter

 Export Excel

 Pagination

 Sorting

Kolom:

Cluster
Kabupaten
Provinsi
PIC
HC
Ticket
Growth HC
SERPO Status
IKR Status

DETAIL CLUSTER

Ketika klik cluster.

Tampilkan:

Informasi Cluster

Nama Cluster
Kabupaten
Provinsi
PIC
HC
Ticket

Trend HC

Grafik 6 bulan.

Menggunakan:

JANUARI
FEBRUARI
MARET
APRIL
MEI
JUNI

Insight Otomatis

Contoh:

HC turun 12% dari Mei ke Juni.

Ticket meningkat 23%.

Kemungkinan penyebab:
- Kompetitor
- Gangguan jaringan
- Kurangnya aktivitas AE

Rekomendasi:
- Site Visit
- Retention Program

PRIORITY ENGINE

Buat scoring otomatis.

Rumus:

Priority Score =
(HC Growth x 40%)
+
(Ticket x 30%)
+
(Potensi Cluster x 30%)

Kategori:

0-40 = Rendah

41-70 = Sedang

71-100 = Tinggi

Tampilkan badge warna.

STRATEGY RECOMMENDATION ENGINE

Jika:

HC turun
dan
Ticket tinggi

Munculkan:

Retention Strategy

Rekomendasi:

 Site Visit

 Follow Up Customer

 Koordinasi Teknik

Jika:

HC rendah
dan
Potensi tinggi

Munculkan:

Acquisition Strategy

Rekomendasi:

 Door to Door

 Digital Ads

 Event

 Partnership


---

Jika:

```text
Homepass tinggi
tetapi HC rendah

Munculkan:

Development Strategy

Rekomendasi:

 Open Access

 FAT Baru

 Homepass Baru


---

# ACTION PLAN

Fitur Kanban Board.

Kolom:

```text
Belum
On Progress
Done

Card berisi:

Cluster
Program
PIC
Deadline
Status

Drag & Drop.

CUSTOMER LOYALTY DASHBOARD

Menampilkan:

 HC Turun

 Repeat Ticket

 Cluster Risiko Tinggi

 Top Ticket

Rekomendasi otomatis:

Site Visit
Promo Retensi
Koordinasi Teknik

COMPETITOR DASHBOARD

Siapkan struktur data:

Kompetitor
Harga
Promo
Coverage

Visualisasi:

 Top Kompetitor

 Harga Kompetitor

 Persebaran Kompetitor

WEEKLY REPORT

Generate otomatis.

Berisi:

Executive Summary
Top Growth Cluster
Top Decline Cluster
Ticket Summary
Program Berjalan
Rencana Minggu Depan

Export PDF.

MONTHLY REPORT

Generate otomatis.

Berisi:

HC Summary
Growth Summary
Ticket Summary
Program Effectiveness
Insight Bulanan
Prioritas Bulan Depan

Export PDF.

FITUR MODERN

Tambahkan:

AI Insight Panel

Membuat insight otomatis dari data.

Smart Alert

Notifikasi jika:

 HC turun >10%

 Ticket naik >20%

 Cluster prioritas tinggi

Cluster Heatmap

Warna:

Hijau = Sehat
Kuning = Waspada
Merah = Prioritas

Dark Mode

Glassmorphism UI

Skeleton Loading

Animated Dashboard

Mobile Responsive

Export

 PDF

 Excel

 CSV

DESAIN

Gunakan gaya:

 Power BI

 Notion

 Linear

 Vercel Dashboard

Dengan:

 Clean Layout

 Sidebar Navigation

 Sticky Header

 KPI Cards

 Interactive Charts

 Modern Analytics Workspace

Aplikasi harus membaca struktur file Excel secara otomatis dan melakukan mapping kolom tanpa perlu coding ulang saat file terbaru diupload.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mc-analystworkspace.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51829d26-32da-44d4-b384-f1d9d9c229db).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
