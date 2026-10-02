# Rekap Absensi & Gaji (Kolabo)

## Versi utama: `Rekap-Gaji-Kolabo.html`
Satu file HTML, buka langsung di Chrome/Edge di laptop mana pun (tidak perlu install). Upload export Kolabo
bulanan, lalu: Dashboard (biaya vs invoice per lokasi, absensi), Rekap Absensi (kode per lokasi, jam masuk & pulang,
per pegawai; bisa dikoreksi per hari), Input Gaji (komponen slip A–E, BPJS, kasbon, bonus, prorata),
Slip Gaji (PDF semua pegawai atau ZIP per pegawai), Excel rekap.

- Pengaturan tersimpan di browser laptop masing-masing. Bagikan ke tim lewat Aturan → Ekspor/Impor pengaturan (.json).
- Sumber halaman ada di `web/` (`p_*.js`, `p_head.html`); jalankan `python web/build.py` untuk membangun ulang.

## Versi skrip Python (lama)

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
- `lembur.csv`   : **aturan lembur manual** per cabang + tanggal. Lembur hanya dibayar bila ada aturan yang cocok; tanpa aturan, lembur tetap tampil sebagai info (kolom "Lembur Tidak Dibayar"). Kolom: `cabang` (isi `*` untuk semua cabang), `tanggal_mulai`, `tanggal_selesai` (kosong = 1 hari), `tarif_per_jam`, `nip` (opsional, kosong = semua karyawan cabang), `keterangan`.
- `karyawan.csv`  : gaji pokok, tunjangan, uang makan -> aktifkan perhitungan potongan & gaji bersih.

## Yang perlu Anda sesuaikan di `config.json`
- `shifts`: daftar shift yang dipakai perusahaan. **Tambah shift baru di sini** bila ada pola jam baru.
- `alias_jadwal`: jadwal HRIS yang salah setting (mis. 08:30-22:00 -> kantor 08:30-17:30; 15:00-11:00 -> 15-23).
- `cabang_shift_tetap`: cabang yang shift-nya tidak ditebak (kantor).
- `penggajian`: telat **> 10 menit = potongan Rp20.000 per kejadian** (`potongan_telat_ambang_menit`, `potongan_telat_per_kejadian`); telat <= 10 menit tidak dipotong. Potongan pulang cepat & bonus double shift default 0.
- `lembur`: minimum menit (60) dan pembulatan (30 mnt). Tarif/jam diisi di `lembur.csv`, bukan di sini.

## Test
`python -m pytest test_absensi.py`
