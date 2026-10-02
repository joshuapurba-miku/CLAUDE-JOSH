import json
from pathlib import Path

import absensi as a

CFG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
SH = a.siapkan_shift(CFG)


def row(si, so, ci, co, cabang="Tim Lapangan DAFI SCHOOL", hari="Selasa"):
    return {"Schedule In": si, "Schedule Out": so, "Check In At": ci, "Check Out At": co, "Branch": cabang, "Day": hari}


def test_sesuai_jadwal():
    sh, _, st, _ = a.tentukan_shift(row("10:00", "18:00", "10:03:00", "18:05:00"), CFG, SH)
    assert st == "sesuai jadwal" and sh["masuk"] == 600


def test_shift_berubah_jadwal_10_tapi_masuk_pagi():
    sh, _, st, _ = a.tentukan_shift(row("10:00", "18:00", "05:50:00", "14:05:00"), CFG, SH)
    assert st.startswith("shift berubah") and sh["masuk"] == 360


def test_jadwal_hris_tidak_valid_dipetakan():
    sh, _, _, _ = a.tentukan_shift(row("15:00", "11:00", "14:50:00", "23:05:00", "Tim Lapangan Play Padel"), CFG, SH)
    assert sh["masuk"] == 900


def test_telat_dihitung_ulang_dari_shift_aktual():
    r = {**row("06:00", "14:00", "09:48:16", "18:33:55"), "Date": "07 Sep 2026", "Employee Name": "X", "NIP": "1",
         "Post": "CSO", "Attendance Code": "Present", "Late (Minutes)": "228", "tanggal": a.tgl("07 Sep 2026")}
    out, _ = a.hitung_hari(r, CFG, SH)
    assert out["Telat (mnt)"] == 0 and out["Shift Aktual"] == "10:00-18:00"
