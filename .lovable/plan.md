# Perbaikan Tampilan Grafik dan Customer Loyalty

## Tujuan
Merapikan kartu distribusi provinsi serta daftar HC Aktif Turun, Cluster Risiko Tinggi, dan Top Ticket agar informasi tidak saling menimpa atau terpotong pada desktop maupun ponsel, tanpa mengubah data atau logika.

## Perubahan
- Susun ulang grafik distribusi provinsi: grafik dan daftar keterangan berdampingan pada layar lebar, lalu bertumpuk rapi pada layar kecil.
- Beri ruang yang stabil untuk nilai, warna, nama provinsi, dan persentase; nama panjang akan tetap terbaca tanpa menabrak elemen lain.
- Susun setiap baris Customer Loyalty menjadi area nama cluster, metrik, dan tombol aksi yang responsif; metrik turun ke baris berikutnya pada ponsel.
- Pastikan judul kartu, daftar panjang, tombol tambah, serta filter periode tetap muat tanpa overflow horizontal.
- Pertahankan warna, data, filter, tautan cluster, dan aksi tambah Retention yang sudah ada.

## Verifikasi
- Periksa halaman Dashboard dan Customer Loyalty pada lebar desktop dan ponsel.
- Pastikan tidak ada teks/tombol terpotong, tumpang tindih, atau scroll horizontal.
- Jalankan pemeriksaan TypeScript setelah perubahan.
