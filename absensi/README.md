# Rekap Absensi Otomatis

Download export absensi dari HRIS tiap bulan, lalu jalankan satu perintah:

```bash
pip install -r requirements.txt          # sekali saja
python absensi.py data/attendance-2026-10-01-to-2026-10-31-report.xlsx
```

Hasil: `output/Rekap_Absensi_YYYY-MM.xlsx` dengan 4 sheet:

| Sheet | Isi |
|---|---|
| Rekap Penggajian | Per karyawan: hadir, absen, telat (kali & menit), pulang cepat, lembur, double shift, selisih vs HRIS, dan potongan/gaji bersih (jika `karyawan.csv` diisi) |
| Detail Harian | Per hari: jadwal HRIS vs shift aktual, telat/pulang cepat/lembur yang sudah dihitung ulang, catatan |
| Perlu Review | Hari/karyawan yang tidak bisa diputuskan otomatis (cek manual hanya ini) |
| Ringkasan Cabang | Total per cabang |

## Cara kerja (kenapa telat HRIS tidak dipakai)
HRIS menghitung telat dari jadwal yang kaku. Script ini menebak **shift aktual** tiap hari dari jam check-in/out
(pilih shift di `config.json` yang paling dekat), memakai jadwal HRIS kecuali ada shift lain yang jauh lebih cocok
(selisih > `ganti_shift_selisih_menit`). Telat/pulang cepat/lembur dihitung dari shift aktual itu.

## File opsional di `data/` (lihat file `.contoh`)
- `izin_cuti.csv` : ubah hari "Absent" menjadi Izin/Sakit/Cuti (kolom `dibayar` ya/tidak menentukan dipotong atau tidak).
- `karyawan.csv`  : gaji pokok, tunjangan, uang makan -> aktifkan perhitungan potongan & gaji bersih.

## Yang perlu Anda sesuaikan di `config.json`
- `shifts`: daftar shift yang dipakai perusahaan. **Tambah shift baru di sini** bila ada pola jam baru.
- `alias_jadwal`: jadwal HRIS yang salah setting (mis. 08:30-22:00 -> kantor 08:30-17:30; 15:00-11:00 -> 15-23).
- `cabang_shift_tetap`: cabang yang shift-nya tidak ditebak (kantor).
- `penggajian`: nilai Rupiah per menit telat, upah lembur, dll. **Default 0, isi sesuai kebijakan.**
- `lembur`: minimum menit, pembulatan, dan cabang yang berhak lembur. Lembur >= 4 jam tidak dibayar otomatis (masuk Perlu Review).

## Test
`python -m pytest test_absensi.py`
