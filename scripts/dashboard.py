"""
dashboard.py — DASHBOARD INTERAKTIF (Streamlit)
Membaca semua Excel di folder inbox, lalu menampilkan KPI, grafik, dan tabel
yang bisa difilter. Dirancang tahan untuk puluhan-ratusan ribu baris (pakai cache).

Jalankan:  streamlit run scripts/dashboard.py
Atau dobel-klik: jalankan-dashboard.bat  (Windows)
"""
import os
import sys
import io
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# agar bisa import modul olah.py yang ada di folder yang sama
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from olah import muat_config, olah_semua, path_absolut

# ---------- Palet warna (placeholder; ganti sesuai desain PPT Anda) ----------
WARNA_UTAMA = "#1F3A5F"
WARNA_MASUK = "#2EA06C"   # hijau = pemasukan
WARNA_KELUAR = "#C0392B"  # merah = pengeluaran
WARNA_NET = "#2E6CB5"     # biru  = net
PALET_KATEGORI = ["#2E6CB5", "#2EA06C", "#E67E22", "#8E44AD",
                  "#C0392B", "#16A085", "#7F8C8D", "#D4AC0D"]

cfg = muat_config()
JUDUL = cfg["ppt"].get("judul", "Dashboard Data")
PERUSAHAAN = cfg["ppt"].get("perusahaan", "")
MU = cfg["ppt"].get("mata_uang", "Rp")

st.set_page_config(page_title=JUDUL, page_icon="📊", layout="wide")


# ---------- Muat data (dengan cache supaya cepat walau data banyak) ----------
@st.cache_data(show_spinner="Membaca & mengolah data...")
def muat_data():
    df, files = olah_semua(cfg)
    return df, [os.path.basename(f) for f in files]


def rupiah(x):
    return f"{MU} {x:,.0f}"


def rupiah_ringkas(x):
    """Format ringkas untuk kartu KPI: rb / jt / M / T."""
    n = abs(x)
    tanda = "-" if x < 0 else ""
    if n >= 1e12:
        return f"{tanda}{MU} {n/1e12:,.1f} T"
    if n >= 1e9:
        return f"{tanda}{MU} {n/1e9:,.1f} M"
    if n >= 1e6:
        return f"{tanda}{MU} {n/1e6:,.1f} jt"
    if n >= 1e3:
        return f"{tanda}{MU} {n/1e3:,.0f} rb"
    return f"{tanda}{MU} {n:,.0f}"


# ---------- Header ----------
kol_judul, kol_tombol = st.columns([4, 1])
with kol_judul:
    st.title(f"📊 {JUDUL}")
    if PERUSAHAAN:
        st.caption(PERUSAHAAN)
with kol_tombol:
    if st.button("🔄 Muat ulang data", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

df, files = muat_data()

if df.empty:
    st.warning(
        "Belum ada data. Taruh file Excel di folder **data/inbox/** "
        "(atau jalankan `python scripts/make_dummy.py` untuk data contoh), "
        "lalu klik **Muat ulang data**."
    )
    st.stop()

# ---------- Sidebar: filter ----------
st.sidebar.header("🔎 Filter")

# filter tanggal
if df["tanggal"].notna().any():
    tgl_min = df["tanggal"].min().date()
    tgl_max = df["tanggal"].max().date()
    rentang = st.sidebar.date_input("Rentang tanggal", (tgl_min, tgl_max),
                                    min_value=tgl_min, max_value=tgl_max)
    if isinstance(rentang, (list, tuple)) and len(rentang) == 2:
        awal, akhir = rentang
        mask = (df["tanggal"].dt.date >= awal) & (df["tanggal"].dt.date <= akhir)
        df = df[mask]

# filter kategori dinamis untuk kolom yang ada
def filter_pilihan(kolom, label):
    global df
    if kolom in df.columns:
        opsi = sorted(x for x in df[kolom].dropna().unique())
        pilih = st.sidebar.multiselect(label, opsi, default=opsi)
        df = df[df[kolom].isin(pilih)]

filter_pilihan("wilayah", "Wilayah")
filter_pilihan("cabang", "Cabang")
filter_pilihan("kategori", "Kategori")

st.sidebar.markdown("---")
st.sidebar.caption(f"File sumber: {len(files)}")
for f in files[:15]:
    st.sidebar.caption(f"• {f}")

if df.empty:
    st.info("Tidak ada data untuk filter yang dipilih.")
    st.stop()

# ---------- Baris KPI ----------
total_masuk = df["kredit"].sum()
total_keluar = df["debit"].sum()
net = total_masuk - total_keluar
k1, k2, k3, k4 = st.columns(4)
k1.metric("Total Pemasukan", rupiah_ringkas(total_masuk), help=rupiah(total_masuk))
k2.metric("Total Pengeluaran", rupiah_ringkas(total_keluar), help=rupiah(total_keluar))
k3.metric("Net / Selisih", rupiah_ringkas(net), help=rupiah(net))
k4.metric("Jumlah Transaksi", f"{len(df):,}")

st.markdown("---")

# ---------- Grafik 1: tren waktu (bulanan) ----------
c1, c2 = st.columns((3, 2))
with c1:
    st.subheader("Tren Bulanan")
    if df["tanggal"].notna().any():
        tren = (df.dropna(subset=["tanggal"])
                  .assign(Bulan=lambda d: d["tanggal"].dt.to_period("M").astype(str))
                  .groupby("Bulan")
                  .agg(Pemasukan=("kredit", "sum"), Pengeluaran=("debit", "sum"))
                  .reset_index())
        fig = go.Figure()
        fig.add_bar(x=tren["Bulan"], y=tren["Pemasukan"], name="Pemasukan",
                    marker_color=WARNA_MASUK)
        fig.add_bar(x=tren["Bulan"], y=tren["Pengeluaran"], name="Pengeluaran",
                    marker_color=WARNA_KELUAR)
        fig.update_layout(barmode="group", height=380,
                          margin=dict(l=10, r=10, t=10, b=10),
                          legend=dict(orientation="h", y=1.1))
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Kolom tanggal tidak tersedia untuk tren waktu.")

# ---------- Grafik 2: komposisi per kategori ----------
with c2:
    st.subheader("Pengeluaran per Kategori")
    per_kat = (df.groupby("kategori")["debit"].sum().reset_index()
                 .query("debit > 0").sort_values("debit", ascending=False))
    if not per_kat.empty:
        fig2 = px.pie(per_kat, names="kategori", values="debit", hole=0.45,
                      color_discrete_sequence=PALET_KATEGORI)
        fig2.update_layout(height=380, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("Belum ada pengeluaran untuk dikategorikan.")

# ---------- Grafik 3: per wilayah/cabang ----------
grp = cfg.get("group_by", "wilayah")
if grp in df.columns:
    st.subheader(f"Pemasukan vs Pengeluaran per {grp.capitalize()}")
    per_grup = (df.groupby(grp)
                  .agg(Pemasukan=("kredit", "sum"), Pengeluaran=("debit", "sum"))
                  .reset_index())
    per_grup["Net"] = per_grup["Pemasukan"] - per_grup["Pengeluaran"]
    per_grup = per_grup.sort_values("Net", ascending=False)
    fig3 = go.Figure()
    fig3.add_bar(y=per_grup[grp], x=per_grup["Pemasukan"], name="Pemasukan",
                 orientation="h", marker_color=WARNA_MASUK)
    fig3.add_bar(y=per_grup[grp], x=per_grup["Pengeluaran"], name="Pengeluaran",
                 orientation="h", marker_color=WARNA_KELUAR)
    fig3.update_layout(barmode="group", height=max(300, 60 * len(per_grup)),
                       margin=dict(l=10, r=10, t=10, b=10),
                       legend=dict(orientation="h", y=1.1))
    st.plotly_chart(fig3, use_container_width=True)

# ---------- Tabel data + unduh ----------
st.markdown("---")
st.subheader("Data Rinci")
kolom_tampil = [c for c in ["tanggal", "wilayah", "cabang", "keterangan",
                            "kategori", "debit", "kredit", "saldo"]
                if c in df.columns]
st.dataframe(df[kolom_tampil], use_container_width=True, height=350)

# tombol unduh hasil terfilter ke Excel
buf = io.BytesIO()
with pd.ExcelWriter(buf, engine="openpyxl") as w:
    df[kolom_tampil].to_excel(w, index=False, sheet_name="Data")
st.download_button("⬇️ Unduh data terfilter (Excel)", buf.getvalue(),
                   file_name="data_terfilter.xlsx",
                   mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
