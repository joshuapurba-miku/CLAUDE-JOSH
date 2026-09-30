"""
process.py — MESIN PENGOLAH DATA
Alur:
  1. Baca SEMUA file Excel di folder inbox
  2. Gabung jadi satu, samakan format, bersihkan
  3. Kategorikan otomatis berdasarkan kata kunci (dari config.yaml)
  4. Buat rekap (per wilayah/cabang/kategori + ringkasan)
  5. Simpan hasil ke data/output/rekap.xlsx
  6. Pindahkan file yang sudah diproses ke data/processed/

Cara pakai:  python scripts/process.py
"""
import os
import sys
import glob
import shutil
from datetime import datetime
import pandas as pd
import yaml

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def muat_config():
    with open(os.path.join(BASE, "config.yaml"), "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def path_absolut(p):
    """Ubah path relatif config jadi absolut relatif ke root proyek."""
    return p if os.path.isabs(p) else os.path.join(BASE, p)


def cari_kolom(df_columns, kandidat):
    """Cari kolom di Excel yang cocok dengan salah satu kandidat (case-insensitive)."""
    lower_map = {c.lower().strip(): c for c in df_columns}
    for nama in kandidat.split("|"):
        if nama.lower().strip() in lower_map:
            return lower_map[nama.lower().strip()]
    return None


def baca_semua_excel(cfg):
    inbox = path_absolut(cfg["folders"]["inbox"])
    files = []
    for pola in cfg["excel"]["file_patterns"]:
        files.extend(glob.glob(os.path.join(inbox, pola)))
    files = sorted(f for f in files if not os.path.basename(f).startswith("~$"))

    if not files:
        print(f"[!] Tidak ada file Excel di: {inbox}")
        print("    Taruh file Anda di sana, atau jalankan: python scripts/make_dummy.py")
        sys.exit(1)

    print(f"Menemukan {len(files)} file Excel:")
    header_row = int(cfg["excel"].get("header_row", 1)) - 1
    sheet = cfg["excel"].get("sheet_name") or 0

    semua = []
    for f in files:
        df = pd.read_excel(f, sheet_name=sheet, header=header_row)
        df.columns = [str(c).strip() for c in df.columns]
        # petakan kolom -> nama baku
        rename = {}
        for baku, kandidat in cfg["columns"].items():
            asli = cari_kolom(df.columns, kandidat)
            if asli:
                rename[asli] = baku
        df = df.rename(columns=rename)
        df["_sumber_file"] = os.path.basename(f)
        semua.append(df)
        print(f"  - {os.path.basename(f)} : {len(df)} baris")

    return pd.concat(semua, ignore_index=True), files


def bersihkan(df, cfg):
    # pastikan kolom wajib ada
    for kolom in ["tanggal", "keterangan", "debit", "kredit"]:
        if kolom not in df.columns:
            df[kolom] = 0 if kolom in ("debit", "kredit") else ""

    df["tanggal"] = pd.to_datetime(df["tanggal"], errors="coerce", dayfirst=True)
    for kolom in ["debit", "kredit", "saldo"]:
        if kolom in df.columns:
            df[kolom] = pd.to_numeric(df[kolom], errors="coerce").fillna(0)
    df["keterangan"] = df["keterangan"].astype(str)

    # buang baris tanpa tanggal DAN tanpa nominal (baris kosong/subtotal)
    sebelum = len(df)
    df = df[~(df["tanggal"].isna() & (df["debit"] == 0) & (df["kredit"] == 0))]
    dibuang = sebelum - len(df)
    if dibuang:
        print(f"  ({dibuang} baris kosong/tidak valid dibuang)")
    return df.reset_index(drop=True)


def kategorikan(df, cfg):
    aturan = cfg.get("kategori", {})

    def tentukan(ket):
        low = str(ket).lower()
        for nama_kat, kata_kunci in aturan.items():
            if any(k.lower() in low for k in kata_kunci):
                return nama_kat
        return "Lainnya"

    df["kategori"] = df["keterangan"].apply(tentukan)
    return df


def buat_rekap(df, cfg, writer):
    fmt_uang = "#,##0"
    grp = cfg.get("group_by", "wilayah")
    if grp not in df.columns:
        grp = "kategori"

    # sheet 1: data lengkap
    kolom_urut = [c for c in ["tanggal", "wilayah", "cabang", "keterangan",
                              "kategori", "debit", "kredit", "saldo", "_sumber_file"]
                  if c in df.columns]
    df[kolom_urut].to_excel(writer, sheet_name="Data Gabungan", index=False)

    # sheet 2: ringkasan umum
    total_masuk = df["kredit"].sum()
    total_keluar = df["debit"].sum()
    ringkas = pd.DataFrame({
        "Keterangan": ["Total Pemasukan (Kredit)", "Total Pengeluaran (Debit)",
                       "Selisih (Net)", "Jumlah Transaksi", "Jumlah File Diolah"],
        "Nilai": [total_masuk, total_keluar, total_masuk - total_keluar,
                  len(df), df["_sumber_file"].nunique()],
    })
    ringkas.to_excel(writer, sheet_name="Ringkasan", index=False)

    # sheet 3: rekap per grup (wilayah/cabang)
    per_grup = df.groupby(grp).agg(
        Pemasukan=("kredit", "sum"),
        Pengeluaran=("debit", "sum"),
        Transaksi=("keterangan", "count"),
    ).reset_index()
    per_grup["Net"] = per_grup["Pemasukan"] - per_grup["Pengeluaran"]
    per_grup = per_grup.sort_values("Net", ascending=False)
    per_grup.to_excel(writer, sheet_name=f"Per {grp.capitalize()}", index=False)

    # sheet 4: rekap per kategori
    per_kat = df.groupby("kategori").agg(
        Pemasukan=("kredit", "sum"),
        Pengeluaran=("debit", "sum"),
        Transaksi=("keterangan", "count"),
    ).reset_index().sort_values("Pengeluaran", ascending=False)
    per_kat.to_excel(writer, sheet_name="Per Kategori", index=False)

    return {"total_masuk": total_masuk, "total_keluar": total_keluar,
            "per_grup": per_grup, "per_kat": per_kat, "grup": grp}


def arsipkan(files, cfg):
    processed = path_absolut(cfg["folders"]["processed"])
    os.makedirs(processed, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for f in files:
        tujuan = os.path.join(processed, f"{stamp}__{os.path.basename(f)}")
        try:
            shutil.move(f, tujuan)
        except Exception as e:
            print(f"  [!] gagal arsip {os.path.basename(f)}: {e}")


def main(arsip=False):
    cfg = muat_config()
    print("=" * 55)
    print(" MENGOLAH DATA")
    print("=" * 55)

    df, files = baca_semua_excel(cfg)
    print(f"\nTotal {len(df)} baris tergabung. Membersihkan...")
    df = bersihkan(df, cfg)
    df = kategorikan(df, cfg)

    out_dir = path_absolut(cfg["folders"]["output"])
    os.makedirs(out_dir, exist_ok=True)
    rekap_path = os.path.join(out_dir, "rekap.xlsx")

    with pd.ExcelWriter(rekap_path, engine="openpyxl") as writer:
        ringkasan = buat_rekap(df, cfg, writer)

    print(f"\n[OK] Rekap tersimpan: {rekap_path}")
    mu = cfg["ppt"]["mata_uang"]
    print(f"     Total Pemasukan  : {mu} {ringkasan['total_masuk']:,.0f}")
    print(f"     Total Pengeluaran: {mu} {ringkasan['total_keluar']:,.0f}")
    print(f"     Net              : {mu} {ringkasan['total_masuk']-ringkasan['total_keluar']:,.0f}")

    if arsip:
        arsipkan(files, cfg)
        print("     File sumber dipindah ke folder processed/")

    print("\nLangkah berikutnya: python scripts/to_pptx.py")
    return rekap_path


if __name__ == "__main__":
    arsip = "--arsip" in sys.argv
    main(arsip=arsip)
