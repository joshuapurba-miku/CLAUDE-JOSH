"""
olah.py — MODUL INTI pengolahan data (dipakai bersama process.py & dashboard.py)
Berisi fungsi baca-banyak-Excel, bersihkan, dan kategorikan.
Tidak untuk dijalankan langsung.
"""
import os
import glob
import pandas as pd
import yaml

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def muat_config():
    with open(os.path.join(BASE, "config.yaml"), "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def path_absolut(p):
    return p if os.path.isabs(p) else os.path.join(BASE, p)


def cari_kolom(df_columns, kandidat):
    """Cari kolom di Excel yang cocok salah satu kandidat (case-insensitive)."""
    lower_map = {str(c).lower().strip(): c for c in df_columns}
    for nama in kandidat.split("|"):
        if nama.lower().strip() in lower_map:
            return lower_map[nama.lower().strip()]
    return None


def daftar_file(cfg, inbox_override=None):
    inbox = path_absolut(inbox_override or cfg["folders"]["inbox"])
    files = []
    for pola in cfg["excel"]["file_patterns"]:
        files.extend(glob.glob(os.path.join(inbox, pola)))
    return sorted(f for f in files if not os.path.basename(f).startswith("~$"))


def baca_semua_excel(cfg, inbox_override=None):
    files = daftar_file(cfg, inbox_override)
    if not files:
        return pd.DataFrame(), []

    header_row = int(cfg["excel"].get("header_row", 1)) - 1
    sheet = cfg["excel"].get("sheet_name") or 0

    semua = []
    for f in files:
        df = pd.read_excel(f, sheet_name=sheet, header=header_row)
        df.columns = [str(c).strip() for c in df.columns]
        rename = {}
        for baku, kandidat in cfg["columns"].items():
            asli = cari_kolom(df.columns, kandidat)
            if asli:
                rename[asli] = baku
        df = df.rename(columns=rename)
        df["_sumber_file"] = os.path.basename(f)
        semua.append(df)

    return pd.concat(semua, ignore_index=True), files


def parse_tanggal(seri):
    """Parser tanggal cerdas: mendukung format ISO (YYYY-MM-DD) DAN
    format lokal Indonesia (DD/MM/YYYY, DD-MM-YYYY) tanpa saling merusak.
    Kolom yang sudah bertipe tanggal dibiarkan apa adanya."""
    if pd.api.types.is_datetime64_any_dtype(seri):
        return seri
    s = seri.astype(str).str.strip()
    hasil = pd.Series(pd.NaT, index=seri.index, dtype="datetime64[ns]")
    # format ISO: diawali tahun 4 digit -> jangan pakai dayfirst
    iso = s.str.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}")
    if iso.any():
        hasil.loc[iso] = pd.to_datetime(s[iso], errors="coerce")
    # sisanya: anggap format lokal (hari dulu, mis. 25/03/2026)
    lokal = ~iso
    if lokal.any():
        hasil.loc[lokal] = pd.to_datetime(s[lokal], errors="coerce", dayfirst=True)
    return hasil


def bersihkan(df, cfg):
    for kolom in ["tanggal", "keterangan", "debit", "kredit"]:
        if kolom not in df.columns:
            df[kolom] = 0 if kolom in ("debit", "kredit") else ""

    df["tanggal"] = parse_tanggal(df["tanggal"])
    for kolom in ["debit", "kredit", "saldo"]:
        if kolom in df.columns:
            df[kolom] = pd.to_numeric(df[kolom], errors="coerce").fillna(0)
    df["keterangan"] = df["keterangan"].astype(str)

    df = df[~(df["tanggal"].isna() & (df["debit"] == 0) & (df["kredit"] == 0))]
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


def olah_semua(cfg=None, inbox_override=None):
    """Baca -> bersihkan -> kategorikan. Kembalikan (df, daftar_file)."""
    if cfg is None:
        cfg = muat_config()
    df, files = baca_semua_excel(cfg, inbox_override)
    if df.empty:
        return df, files
    df = bersihkan(df, cfg)
    df = kategorikan(df, cfg)
    return df, files
