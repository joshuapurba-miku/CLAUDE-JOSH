"""
process.py — MESIN PENGOLAH DATA (untuk hasil Excel rekap)
Alur:
  1. Baca SEMUA file Excel di folder inbox
  2. Gabung, bersihkan, kategorikan (via modul olah.py)
  3. Buat rekap (ringkasan + per wilayah/cabang + per kategori)
  4. Simpan ke data/output/rekap.xlsx
  5. (opsional --arsip) pindahkan file sumber ke data/processed/

Cara pakai:  python scripts/process.py   [--arsip]
"""
import os
import sys
import shutil
from datetime import datetime
import pandas as pd

from olah import muat_config, path_absolut, olah_semua


def buat_rekap(df, cfg, writer):
    grp = cfg.get("group_by", "wilayah")
    if grp not in df.columns:
        grp = "kategori"

    kolom_urut = [c for c in ["tanggal", "wilayah", "cabang", "keterangan",
                              "kategori", "debit", "kredit", "saldo", "_sumber_file"]
                  if c in df.columns]
    df[kolom_urut].to_excel(writer, sheet_name="Data Gabungan", index=False)

    total_masuk = df["kredit"].sum()
    total_keluar = df["debit"].sum()
    ringkas = pd.DataFrame({
        "Keterangan": ["Total Pemasukan (Kredit)", "Total Pengeluaran (Debit)",
                       "Selisih (Net)", "Jumlah Transaksi", "Jumlah File Diolah"],
        "Nilai": [total_masuk, total_keluar, total_masuk - total_keluar,
                  len(df), df["_sumber_file"].nunique()],
    })
    ringkas.to_excel(writer, sheet_name="Ringkasan", index=False)

    per_grup = df.groupby(grp).agg(
        Pemasukan=("kredit", "sum"),
        Pengeluaran=("debit", "sum"),
        Transaksi=("keterangan", "count"),
    ).reset_index()
    per_grup["Net"] = per_grup["Pemasukan"] - per_grup["Pengeluaran"]
    per_grup = per_grup.sort_values("Net", ascending=False)
    per_grup.to_excel(writer, sheet_name=f"Per {grp.capitalize()}", index=False)

    per_kat = df.groupby("kategori").agg(
        Pemasukan=("kredit", "sum"),
        Pengeluaran=("debit", "sum"),
        Transaksi=("keterangan", "count"),
    ).reset_index().sort_values("Pengeluaran", ascending=False)
    per_kat.to_excel(writer, sheet_name="Per Kategori", index=False)

    return {"total_masuk": total_masuk, "total_keluar": total_keluar}


def arsipkan(files, cfg):
    processed = path_absolut(cfg["folders"]["processed"])
    os.makedirs(processed, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for f in files:
        try:
            shutil.move(f, os.path.join(processed, f"{stamp}__{os.path.basename(f)}"))
        except Exception as e:
            print(f"  [!] gagal arsip {os.path.basename(f)}: {e}")


def main(arsip=False):
    cfg = muat_config()
    print("=" * 55)
    print(" MENGOLAH DATA")
    print("=" * 55)

    df, files = olah_semua(cfg)
    if df.empty:
        inbox = path_absolut(cfg["folders"]["inbox"])
        print(f"[!] Tidak ada file Excel di: {inbox}")
        print("    Taruh file Anda di sana, atau: python scripts/make_dummy.py")
        sys.exit(1)

    print(f"Menemukan {len(files)} file, total {len(df)} baris valid.")

    out_dir = path_absolut(cfg["folders"]["output"])
    os.makedirs(out_dir, exist_ok=True)
    rekap_path = os.path.join(out_dir, "rekap.xlsx")

    with pd.ExcelWriter(rekap_path, engine="openpyxl") as writer:
        ringkasan = buat_rekap(df, cfg, writer)

    mu = cfg["ppt"]["mata_uang"]
    print(f"\n[OK] Rekap tersimpan: {rekap_path}")
    print(f"     Total Pemasukan  : {mu} {ringkasan['total_masuk']:,.0f}")
    print(f"     Total Pengeluaran: {mu} {ringkasan['total_keluar']:,.0f}")
    print(f"     Net              : {mu} {ringkasan['total_masuk']-ringkasan['total_keluar']:,.0f}")

    if arsip:
        arsipkan(files, cfg)
        print("     File sumber dipindah ke folder processed/")

    print("\nLangkah berikutnya:")
    print("  - Laporan PPT     : python scripts/to_pptx.py")
    print("  - Dashboard       : jalankan-dashboard.bat  (atau: streamlit run scripts/dashboard.py)")
    return rekap_path


if __name__ == "__main__":
    main(arsip="--arsip" in sys.argv)
