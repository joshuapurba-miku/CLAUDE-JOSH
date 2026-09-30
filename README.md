# Sistem Pengolahan Data → Dashboard, Excel & PowerPoint

Sistem otomatis: taruh file Excel di satu folder, lalu pilih hasilnya —
**dashboard interaktif**, **rekap Excel**, atau **laporan PowerPoint**.

```
                              ┌─→  DASHBOARD interaktif (scripts/dashboard.py)
  data/inbox/  ──→  olah ──→  ├─→  rekap Excel        (scripts/process.py → rekap.xlsx)
  (Excel mentah)              └─→  laporan PowerPoint (scripts/to_pptx.py → laporan.pptx)
```

Semua berbagi satu mesin pengolah (`scripts/olah.py`), jadi angkanya konsisten.

---

## Cara pakai sehari-hari

**Langkah 1 — selalu:** taruh file Excel sumber ke folder `data/inbox/`

Lalu pilih hasil yang diinginkan:

### A. Dashboard interaktif (filter + grafik langsung)
- **Windows:** dobel-klik `jalankan-dashboard.bat`
- **atau terminal:** `streamlit run scripts/dashboard.py`

Dashboard terbuka di browser (`localhost`). Ada filter tanggal/wilayah/cabang/
kategori, KPI, grafik interaktif, tabel, dan tombol unduh data terfilter.
Setelah menambah file Excel baru, klik tombol **🔄 Muat ulang data**.

### B. Rekap Excel
```
python scripts/process.py          (tambah --arsip untuk memindah file sumber ke processed/)
```
Hasil: `data/output/rekap.xlsx` (Data Gabungan, Ringkasan, Per Wilayah, Per Kategori).

### C. Laporan PowerPoint
```
python scripts/process.py
python scripts/to_pptx.py
```
Hasil: `data/output/laporan.pptx` (judul, ringkasan, grafik, penutup).

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
│   ├── olah.py        ← MESIN INTI (baca+bersih+kategori), dipakai bersama
│   ├── make_dummy.py  ← buat data contoh
│   ├── process.py     ← olah Excel → rekap.xlsx
│   ├── to_pptx.py     ← rekap → laporan.pptx
│   └── dashboard.py   ← dashboard interaktif (Streamlit)
├── templates/         ← (opsional) template PPT berlogo
├── jalankan-dashboard.bat  ← dobel-klik (Windows) untuk buka dashboard
├── config.yaml        ← PENGATURAN semua aturan
└── requirements.txt
```
