"""
make_dummy.py — Membuat file Excel CONTOH (dummy) untuk demo sistem.
Jalankan sekali untuk mengisi folder data/inbox dengan data pura-pura,
supaya Anda bisa melihat alur Excel -> rekap -> PPT bekerja.
Hapus/timpa file dummy ini dengan data asli Anda nanti.
"""
import os
import random
from datetime import date, timedelta
import pandas as pd

random.seed(7)

INBOX = os.path.join(os.path.dirname(__file__), "..", "data", "inbox")
os.makedirs(INBOX, exist_ok=True)

WILAYAH = ["Jakarta", "Bandung", "Surabaya", "Medan"]
CABANG = {
    "Jakarta": ["JKT-01", "JKT-02"],
    "Bandung": ["BDG-01"],
    "Surabaya": ["SBY-01", "SBY-02"],
    "Medan": ["MDN-01"],
}
KETERANGAN_MASUK = [
    "Transfer masuk pembayaran invoice klien",
    "Setoran tunai cabang",
    "Pembayaran tagihan kontrak",
]
KETERANGAN_KELUAR = [
    "Pembayaran gaji karyawan",
    "Bayar listrik kantor",
    "Bayar internet",
    "Pembelian ATK",
    "BBM transport operasional",
    "Setor pajak PPh",
    "Iuran BPJS",
    "Biaya admin bank",
    "Sewa gedung",
]


def buat_satu_file(nama_file, tgl_awal, jml_baris):
    baris = []
    saldo = 50_000_000
    for i in range(jml_baris):
        tgl = tgl_awal + timedelta(days=random.randint(0, 27))
        wil = random.choice(WILAYAH)
        cab = random.choice(CABANG[wil])
        masuk = random.random() < 0.4
        if masuk:
            ket = random.choice(KETERANGAN_MASUK)
            kredit = random.choice([2_500_000, 5_000_000, 7_500_000, 12_000_000])
            debit = 0
            saldo += kredit
        else:
            ket = random.choice(KETERANGAN_KELUAR)
            debit = random.choice([500_000, 1_200_000, 3_000_000, 8_000_000])
            kredit = 0
            saldo -= debit
        baris.append({
            "Tanggal": tgl.strftime("%Y-%m-%d"),
            "Wilayah": wil,
            "Cabang": cab,
            "Keterangan": ket,
            "Debit": debit,
            "Kredit": kredit,
            "Saldo": saldo,
        })
    df = pd.DataFrame(baris).sort_values("Tanggal")
    path = os.path.join(INBOX, nama_file)
    df.to_excel(path, index=False)
    print(f"  dibuat: {nama_file}  ({len(df)} baris)")


if __name__ == "__main__":
    print("Membuat file Excel dummy di data/inbox ...")
    buat_satu_file("tarik-data-01.xlsx", date(2026, 9, 1), 40)
    buat_satu_file("tarik-data-02.xlsx", date(2026, 9, 1), 35)
    buat_satu_file("tarik-data-03.xlsx", date(2026, 9, 1), 30)
    print("Selesai. Sekarang jalankan: python scripts/process.py")
