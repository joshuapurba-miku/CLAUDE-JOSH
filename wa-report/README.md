# Rekap Check In / Check Out dari Grup WhatsApp

Mengubah ekspor chat grup WhatsApp menjadi Excel: siapa (unit) sudah Check In / Check Out, jam berapa, dan siapa yang belum lapor. Tanpa instalasi tambahan, cukup Node.js.

## Cara pakai (harian)
1. Di WhatsApp: buka grup > menu titik tiga > **Lainnya > Ekspor chat > Tanpa media**. Simpan file `.txt`.
2. Di PowerShell, dari folder repo ini:
   ```
   node wa-report/rekap-checkin.mjs "D:\wilayah\Chat_WhatsApp.txt" rekap.xlsx
   ```
3. Opsi batas jam (untuk menandai terlambat):
   ```
   node wa-report/rekap-checkin.mjs chat.txt rekap.xlsx --batas-in=08:30 --batas-out=17:00
   ```

## Isi Excel
- **Matriks**: unit x tanggal. Hijau = lengkap, merah = tidak lapor, kuning = hanya In atau hanya Out.
- **Rekap Harian**: satu baris per unit per hari, dengan jam In/Out, status, dan catatan terlambat.
- **Nominal**: satu baris per item yang ada nominalnya (BCM, BWU, KUR, KKLK, KPP, Pra NPL, NPL, HB, Pelunasan, Downsizing), dengan nominal dalam Rp juta (angka, bisa langsung di-SUM atau di-pivot), jumlah debitur, dan rincian nama debitur.
- **Total Check Out** / **Total Check In**: total per unit per kategori, dengan baris TOTAL di bawah.
- **Per Tanggal (Out)**: total per hari per kategori dari Check Out.
- **Perlu Dicek**: baris berangka yang tidak berhasil dibaca, supaya tidak ada nominal yang lolos diam-diam.
- **Detail Pesan**: semua pesan Check In/Out beserta isinya.

## Catatan
- Yang dihitung sebagai pesan laporan: pesan yang baris pertamanya `Check In` / `Check Out` (huruf besar/kecil dan tanda `*` tidak masalah), dan baris kedua adalah nama unit.
- Bila satu unit mengirim beberapa kali dalam sehari, dipakai Check In paling awal dan Check Out paling akhir.
- Nama unit yang ditulis berbeda diseragamkan lewat `ALIAS` di `rekap-checkin.mjs`.
- Hari pertama sebuah ekspor bisa tampak "Tidak lapor" bila Anda baru masuk grup di tengah hari itu.
- File chat dan hasil Excel berisi data nasabah dan tidak ikut di-commit (lihat `.gitignore`).

## Otomatis harian (Windows)
Ekspor chat dari HP tetap manual (WhatsApp tidak menyediakan cara resmi gratis), tetapi rekapnya berjalan sendiri.
1. Buat folder `D:\wilayah\chat-masuk`. Simpan ekspor chat `.txt` di sana; file terbaru yang dipakai.
2. Sesuaikan dua jalur di `rekap-otomatis.bat` (`FOLDER_CHAT` dan `REPO`).
3. Buka **Task Scheduler > Create Basic Task**, pilih Daily jam 18.30, action **Start a program**, isi jalur `rekap-otomatis.bat`.
4. Hasil: `D:\wilayah\rekap\rekap-TAHUN-BULAN-TANGGAL.xlsx`. Kesalahan tercatat di `D:\wilayah\rekap\log.txt`.

## Tentang nominal
- Nominal hanya diambil dari bagian realisasi (sebelum "Prognosa Kinerja Bisnis Harian"). Angka prognosa/BD adalah akumulasi bulanan dan tidak dijumlahkan.
- Check In dan Check Out sering memuat transaksi yang sama. Jangan menjumlahkan keduanya; pakai **Total Check Out** sebagai realisasi.
- BWU dan Pelunasan dihitung sekali: baris induk bila ada, kalau tidak jumlah rinciannya.
- Bila satu unit mengirim Check Out lebih dari sekali dalam sehari, hanya yang terakhir dihitung (kolom "Dihitung di Total").
