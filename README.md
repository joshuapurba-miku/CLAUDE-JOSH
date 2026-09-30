# Sistem Pengolahan Data → Excel & PowerPoint

Sistem otomatis: taruh file Excel di satu folder, jalankan, keluar
**rekap Excel** + **laporan PowerPoint** lengkap dengan grafik.

```
  data/inbox/          →   scripts/process.py   →   data/output/rekap.xlsx
  (file Excel mentah)      scripts/to_pptx.py   →   data/output/laporan.pptx
```

---

## Cara pakai sehari-hari (3 langkah)

1. **Taruh file Excel** sumber ke folder `data/inbox/`
2. Jalankan pengolah:
   ```
   python scripts/process.py
   ```
3. Jalankan pembuat PPT:
   ```
   python scripts/to_pptx.py
   ```

Hasil ada di folder `data/output/` : `rekap.xlsx` dan `laporan.pptx`.

> Ingin file sumber otomatis diarsipkan setelah diolah?
> `python scripts/process.py --arsip` (file dipindah ke `data/processed/`)

---

## Coba dulu dengan data contoh (dummy)

Belum punya data untuk diuji? Buat data pura-pura dulu:
```
python scripts/make_dummy.py
python scripts/process.py
python scripts/to_pptx.py
```

---

## Menyesuaikan dengan data ASLI Anda

Semua aturan ada di **`config.yaml`** — Anda tidak perlu mengubah script Python.

Yang biasanya perlu disesuaikan:

1. **Nama kolom.** Di bagian `columns:`, samakan sisi kanan dengan nama
   kolom PERSIS di file Excel Anda. Contoh jika kolom tanggal Anda bernama
   "Tgl Transaksi":
   ```yaml
   columns:
     tanggal: "Tgl Transaksi"
   ```
2. **Baris header.** Jika judul kolom bukan di baris 1 (misal ada logo di
   atas), ubah `header_row:`.
3. **Kategori.** Tambah/ubah kata kunci di bagian `kategori:` sesuai istilah
   di data Anda.
4. **Pengelompokan.** `group_by:` menentukan grafik dikelompokkan per apa
   (`wilayah` / `cabang` / `kategori`).
5. **Identitas PPT.** Ganti `judul`, `perusahaan`, dan (opsional) `template`
   PPT berlogo di bagian `ppt:`.

### Membaca langsung dari folder D:\ (komputer kantor)
Di `config.yaml`, arahkan `inbox` ke folder data Anda
(pakai garis miring `/`):
```yaml
folders:
  inbox: "D:/Wilayah/DATA/TARIK DATA/28092026"
```

---

## Instalasi (sekali saja, di komputer kantor)

1. Pasang **Python 3.11+** dari https://python.org (centang "Add to PATH").
2. Pasang library:
   ```
   pip install -r requirements.txt
   ```

---

## Struktur folder

```
CLAUDE-JOSH/
├── data/
│   ├── inbox/       ← taruh file Excel di sini
│   ├── processed/   ← arsip file yang sudah diolah
│   └── output/      ← hasil: rekap.xlsx + laporan.pptx
├── scripts/
│   ├── make_dummy.py  ← buat data contoh
│   ├── process.py     ← olah Excel → rekap.xlsx
│   └── to_pptx.py     ← rekap → laporan.pptx
├── templates/         ← (opsional) template PPT berlogo
├── config.yaml        ← PENGATURAN semua aturan
└── requirements.txt
```
