  // ---------- util waktu ----------
  const BULAN = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, agt: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };
  function parseTgl(v) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const p = String(v).trim().split(/\s+/);
    const m = BULAN[(p[1] || "").slice(0, 3).toLowerCase()];
    if (p.length < 3 || !m) return null;
    return p[2] + "-" + String(m).padStart(2, "0") + "-" + String(p[0]).padStart(2, "0");
  }
  function toTimeStr(v) {
    if (typeof v === "number" && v >= 0 && v < 1) {
      const s = Math.round(v * 86400);
      const f = (x) => String(x).padStart(2, "0");
      return f(Math.floor(s / 3600)) + ":" + f(Math.floor(s % 3600 / 60)) + ":" + f(s % 60);
    }
    return String(v == null ? "" : v).trim();
  }
  function valid(s) { s = String(s == null ? "" : s).trim(); return !(s === "" || s === "X" || s === "Off" || s === "-" || s === "undefined"); }
  function menit(s) {
    s = String(s == null ? "" : s).trim();
    if (s.length < 5 || s[2] !== ":") return null;
    return +s.slice(0, 2) * 60 + +s.slice(3, 5) + (s.length >= 8 ? +s.slice(6, 8) / 60 : 0);
  }
  const hhmm = (x) => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(Math.floor(x % 60)).padStart(2, "0");
  const list = (s) => String(s || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

  // ---------- baca export ----------
  const WAJIB = ["Date", "Day", "Employee Name", "NIP", "Branch", "Post", "Schedule In", "Schedule Out", "Check In At", "Check Out At", "Attendance Code"];
  function normalisasi(json) {
    if (!json.length) throw new Error("Sheet kosong.");
    const kurang = WAJIB.filter((k) => !(k in json[0]));
    if (kurang.length) throw new Error("Kolom tidak ditemukan: " + kurang.join(", ") + ". Format export HRIS berubah?");
    return json.map((r) => ({
      iso: parseTgl(r["Date"]), hari: String(r["Day"]).trim(), nama: String(r["Employee Name"]).trim(),
      nip: String(r["NIP"] == null ? "" : r["NIP"]).trim(), cabang: String(r["Branch"]).trim(), posisi: String(r["Post"]).trim(),
      si: toTimeStr(r["Schedule In"]), so: toTimeStr(r["Schedule Out"]),
      ci: toTimeStr(r["Check In At"]), co: toTimeStr(r["Check Out At"]),
      code: String(r["Attendance Code"]).trim(), lateHris: r["Late (Minutes)"],
      brS: toTimeStr(r["Break Start"]), brF: toTimeStr(r["Break Finish"]),
      dbl: toTimeStr(r["Double Shift Check In At"]),
      pt: String(r["Company"] == null ? "" : r["Company"]).trim()
    })).filter((r) => r.iso && r.nama);
  }

  // ---------- shift ----------
  function prepShifts() {
    return cfg.shifts.filter((s) => s.nama && menit(s.masuk + ":00") != null).map((s) => ({
      nama: s.nama, masuk: menit(s.masuk), pulang: menit(s.pulang),
      cabang: list(s.cabang), hari: list(s.hari)
    }));
  }
  function aliasMap() {
    const m = {};
    String(cfg.alias || "").split("\n").forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    return m;
  }
  function shiftTerjadwal(r, shifts, alias) {
    if (!(valid(r.si) && valid(r.so))) return null;
    const key = r.si + "-" + r.so;
    if (alias[key]) { const s = shifts.find((x) => x.nama === alias[key]); if (s) return s; }
    const a = menit(r.si), b = menit(r.so);
    if (a == null || b == null || b <= a || b - a > 720) return null;
    return { nama: "Jadwal " + key, masuk: a, pulang: b, cabang: [], hari: [] };
  }
  function biaya(sh, ci, co) {
    let c = Math.abs(ci - sh.masuk);
    if (co != null && co > ci) c += 0.5 * Math.abs(co - sh.pulang);
    return c;
  }
  function tentukanShift(r, shifts, alias, tetap) {
    const ci = menit(r.ci), co = menit(r.co);
    const jad = shiftTerjadwal(r, shifts, alias);
    if (jad && tetap.includes(r.cabang)) return { sh: jad, status: "sesuai jadwal (shift tetap)", bi: Math.abs(ci - jad.masuk) };
    const cands = shifts.filter((s) => (!s.cabang.length || s.cabang.includes(r.cabang)) && (!s.hari.length || s.hari.includes(r.hari)));
    if (jad && !cands.some((c) => c.nama === jad.nama)) cands.push(jad);
    if (!cands.length) return { sh: jad, status: "sesuai jadwal", bi: 0 };
    let best = cands[0], bb = biaya(best, ci, co);
    cands.forEach((c) => { const b = biaya(c, ci, co); if (b < bb) { best = c; bb = b; } });
    if (!jad) return { sh: best, status: "shift ditebak (jadwal HRIS tidak valid)", bi: bb };
    const bj = biaya(jad, ci, co);
    if (best.hari.length && best.nama !== jad.nama && bb < bj) return { sh: best, status: "shift khusus hari", bi: bb };
    if (bj - bb >= cfg.gantiShift && best.nama !== jad.nama) return { sh: best, status: "shift berubah (otomatis)", bi: bb };
    return { sh: jad, status: "sesuai jadwal", bi: bj };
  }
  function tarifLembur(cabang, iso, nip) {
    for (const a of cfg.lembur) {
      if (!a.mulai) continue;
      if (a.cabang !== "*" && a.cabang !== cabang) continue;
      if (a.nip && a.nip.trim() && a.nip.trim() !== nip) continue;
      const akhir = a.selesai || a.mulai;
      if (a.mulai <= iso && iso <= akhir) return +a.tarif || 0;
    }
    return null;
  }

  // extend: jam kerja menutup shift berikutnya (atau sebelumnya) di lokasi yang sama
  function cariExtend(r, sh, ci, co, shifts) {
    const tol = +cfg.extendTol || 60;
    const cocok = shifts.filter((s) => (!s.cabang.length || s.cabang.includes(r.cabang)) && (!s.hari.length || s.hari.includes(r.hari)) && !(s.masuk === sh.masuk && s.pulang === sh.pulang));
    const nx = cocok.find((s) => Math.abs(s.masuk - sh.pulang) <= tol && s.pulang - sh.pulang >= 240 && co >= s.pulang - tol);
    const pv = nx ? null : cocok.find((s) => Math.abs(s.pulang - sh.masuk) <= tol && sh.masuk - s.masuk >= 240 && ci <= s.masuk + tol);
    const x = nx || pv;
    return x ? hhmm(x.masuk) + "-" + hhmm(x.pulang) : "";
  }

  // ---------- hitung per hari ----------
  function hitungHari(r, shifts, alias, tetap) {
    const o = {
      Tanggal: r.iso, Hari: r.hari, Nama: r.nama, NIP: r.nip, Cabang: r.cabang, Posisi: r.posisi,
      "Jadwal HRIS": valid(r.si) ? r.si + "-" + r.so : "", "Shift Aktual": "", "Status Shift": "",
      "Check In": "", "Check Out": "", Status: r.code, "Telat (mnt)": 0, "Pulang Cepat (mnt)": 0,
      "Lembur (mnt)": 0, "Lembur Dibayar (jam)": 0, "Upah Lembur (Rp)": 0, "Potongan Telat (Rp)": 0,
      "Jam Kerja": 0, "Double Shift": "", "Telat HRIS (mnt)": 0, Catatan: [], _review: [],
      key: r.nama + "||" + r.nip, rawStatus: r.code, tidakCO: false, lemburTarif: tarifLembur(r.cabang, r.iso, r.nip)
    };
    if (list(cfg.tanpaJadwal).includes(r.cabang)) {
      o.tanpaJadwal = true;
      if (r.code !== "Present" || !valid(r.ci)) { o.Status = "Off"; o.rawStatus = "Off"; o.noOrder = true; return o; }
      const ci0 = menit(r.ci), co0 = menit(r.co);
      o["Check In"] = r.ci; o["Check Out"] = valid(r.co) ? r.co : "";
      o["Shift Aktual"] = "sesuai order"; o["Status Shift"] = "tanpa jadwal tetap";
      if (co0 == null || co0 <= ci0) { o._review.push("check-out kosong/tidak valid, jam order tidak bisa dihitung"); o.tidakCO = true; }
      else { o["Jam Kerja"] = Math.round((co0 - ci0) / 60 * 100) / 100; o.Catatan.push("order home cleaning " + o["Jam Kerja"] + " jam"); }
      return o;
    }
    if (r.code === "Off" && valid(r.ci)) {
      o.Status = "OffMasuk"; o["Check In"] = r.ci; o["Check Out"] = valid(r.co) ? r.co : "";
      const a0 = menit(r.ci), b0 = menit(r.co);
      if (b0 != null && b0 > a0) o["Jam Kerja"] = Math.round((b0 - a0) / 60 * 100) / 100;
      o.Catatan.push("masuk di hari off");
      o._review.push("masuk di hari off: dibayar sebagai insentif mengganti (prorata). Ubah status ke Off jika hanya tukar jadwal, atau catat di Backup jika menggantikan rekan di lokasi lain");
      return o;
    }
    if (r.code !== "Present" || !valid(r.ci)) { if (r.code === "Present") o.Status = "Absent"; o.rawStatus = o.Status; return o; }
    const ci = menit(r.ci), co = menit(r.co);
    o["Check In"] = r.ci; o["Check Out"] = valid(r.co) ? r.co : "";
    if (valid(r.lateHris) && !isNaN(+r.lateHris)) o["Telat HRIS (mnt)"] = +r.lateHris;
    if (r.ci.slice(6, 8) === "00") o.Catatan.push("check-in input manual");

    const t = tentukanShift(r, shifts, alias, tetap);
    const sh = t.sh;
    if (!sh) { o._review.push("jadwal dan shift tidak ditemukan, cek pengaturan shift"); return o; }
    o["Shift Aktual"] = hhmm(sh.masuk) + "-" + hhmm(sh.pulang);
    o["Status Shift"] = t.status;
    if (t.bi > cfg.reviewBiaya) o._review.push("jam absen tidak cocok dengan shift mana pun (selisih " + Math.round(t.bi) + " mnt)");

    o["Telat (mnt)"] = Math.max(0, Math.trunc(ci - sh.masuk) - cfg.tolTelat);
    if (o["Telat (mnt)"] > cfg.telatAmbang) o["Potongan Telat (Rp)"] = cfg.telatNominal;

    if (co == null || co <= ci) {
      o._review.push("check-out kosong/tidak valid (cek lupa absen pulang)");
      o.tidakCO = true;
    } else {
      let kerja = co - ci;
      const ks = menit(r.brS), kf = menit(r.brF);
      if (ks != null && kf != null && kf > ks) kerja -= kf - ks;
      o["Jam Kerja"] = Math.round(kerja / 60 * 100) / 100;
      if (kerja < cfg.minKerja) {
        o._review.push("durasi kerja hanya " + Math.round(kerja) + " mnt (check-out salah?)");
        o.tidakCO = true;
      } else {
        o["Pulang Cepat (mnt)"] = Math.max(0, Math.trunc(sh.pulang - co) - cfg.tolPulang);
        const ext = !tetap.includes(r.cabang) && cariExtend(r, sh, ci, co, shifts);
        if (ext) {
          o["Double Shift"] = "ya"; o.Extend = ext;
          o._review = o._review.filter((x) => !x.startsWith("jam absen tidak cocok"));
          o.Catatan.push("extend ke shift " + ext + " (dibayar sebagai insentif mengganti)");
          if (t.status.startsWith("shift berubah")) o.Catatan.push("shift berubah dari " + o["Jadwal HRIS"]);
          return o;
        }
        const lembur = Math.trunc(co - sh.pulang);
        o["Lembur (mnt)"] = Math.max(0, lembur);
        if (lembur >= cfg.lemburMin) {
          const tarif = o.lemburTarif;
          if (tarif != null) {
            const p = cfg.lemburBulat || 30;
            o["Lembur Dibayar (jam)"] = Math.floor(lembur / p) * p / 60;
            o["Upah Lembur (Rp)"] = Math.round(o["Lembur Dibayar (jam)"] * tarif);
            o.Catatan.push("lembur dibayar (aturan manual)");
          } else o.Catatan.push("lembur terdeteksi, tidak ada aturan lembur → tidak dibayar");
        }
        if (lembur >= 240) o._review.push("lembur ≥ 4 jam, pastikan jam pulang benar");
      }
    }
    if (valid(r.dbl)) { o["Double Shift"] = "ya"; o.Catatan.push("double shift (shift tambahan)"); }
    if (t.status.startsWith("shift berubah")) o.Catatan.push("shift berubah dari " + o["Jadwal HRIS"]);
    return o;
  }

