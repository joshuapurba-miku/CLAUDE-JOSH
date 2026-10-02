
  // ---------- koreksi manual per hari ----------
  const STATUS_ADJ = { hadir: "Present", absen: "Absent", izin: "Izin", sakit: "Sakit", cuti: "Cuti", off: "Off" };
  const STATUS_LABEL = { Present: "Hadir", Absent: "Tanpa keterangan", Izin: "Izin (dipotong)", Sakit: "Sakit (dibayar)", Cuti: "Cuti (dibayar)", Off: "Off / libur" };
  const isNum = (x) => x !== undefined && x !== null && x !== "" && !isNaN(+x);
  function kodeHari(o) {
    if (o.Status === "Present") return o["Telat (mnt)"] > cfg.telatAmbang ? "T" : "H";
    return { Absent: "A", Izin: "I", Sakit: "S", Cuti: "C", Off: "O" }[o.Status] || "O";
  }
  function applyAdj(o) {
    o.auto = { status: o.Status, telat: o["Telat (mnt)"], lembur: o["Lembur Dibayar (jam)"], lemburMnt: o["Lembur (mnt)"] };
    const a = cfg.adj[o.key + "|" + o.Tanggal];
    if (a) {
      o.adj = a;
      if (a.status && STATUS_ADJ[a.status]) {
        const ns = STATUS_ADJ[a.status];
        if (ns !== "Present") {
          o["Telat (mnt)"] = 0; o["Pulang Cepat (mnt)"] = 0; o["Lembur Dibayar (jam)"] = 0; o["Upah Lembur (Rp)"] = 0; o.tidakCO = false;
        }
        o.Status = ns;
      }
      if (isNum(a.telat) && o.Status === "Present") o["Telat (mnt)"] = Math.max(0, +a.telat);
      if (isNum(a.lembur) && o.Status === "Present") {
        o["Lembur Dibayar (jam)"] = Math.max(0, +a.lembur);
        o["Upah Lembur (Rp)"] = Math.round(o["Lembur Dibayar (jam)"] * (o.lemburTarif != null ? o.lemburTarif : cfg.tarifLembur));
      }
      if (a.co === "ok") o.tidakCO = false;
      o.Catatan.push("dikoreksi manual" + (a.ket ? ": " + a.ket : ""));
      o._review = [];
    }
    o["Potongan Telat (Rp)"] = o.Status === "Present" && o["Telat (mnt)"] > cfg.telatAmbang ? cfg.telatNominal : 0;
    o.Kode = kodeHari(o);
    return o;
  }

  // ---------- komponen gaji ----------
  const F_TETAP = [
    ["jabatan", "Jabatan / level", "text", "dl-jab"], ["status", "Status kerja", "text", "dl-status"],
    ["oGaji", "Gaji pokok khusus"], ["oTunjMT", "Tunj. makan & transport khusus"], ["oTunjKin", "Tunj. kinerja khusus"], ["oTunjAbs", "Tunj. absensi khusus"],
    ["benKes", "BPJS Kesehatan (dibayar perusahaan)"], ["benTK", "BPJS Ketenagakerjaan (dibayar perusahaan)"],
    ["iuranKes", "Iuran BPJS Kesehatan (dipotong)"], ["iuranTK", "Iuran BPJS Ketenagakerjaan (dipotong)"], ["addOn", "Add-on benefit (pengganti BPJS)"],
    ["bank", "Bank", "text", "dl-bank"], ["noRek", "No. rekening", "text"], ["atasNama", "Atas nama rekening", "text"]
  ];
  const F_BULAN = [
    { sec: "Masa kerja bulan ini", hint: "Isi hanya jika pegawai baru masuk atau berhenti di tengah bulan. Gaji tetap dihitung prorata.", f: [["tglMasuk", "Mulai kerja tanggal", "date"], ["tglKeluar", "Berhenti tanggal", "date"]] },
    { sec: "B. Home Cleaning", hint: "Isi jam tiap order di luar absensi, pisahkan koma (misal: 5, 8, 3). Bagi hasil, makan, dan transport dihitung dari tabel tarif home cleaning di Aturan.", f: [["hcOrders", "Order (jam per order)", "text"], ["hcBagi", "Bagi hasil tambahan"], ["hcMakan", "Tunj. makan tambahan"], ["hcTrans", "Tunj. transport tambahan"]] },
    { sec: "C. Project", f: [["pjBagi", "Imbal bagi hasil"], ["pjMakan", "Tunjangan makan"], ["pjTrans", "Tunjangan transport"], ["pjKin", "Tunjangan kinerja"]] },
    { sec: "D. Additional performance", f: [["jaspro", "Insentif Jaspro (referral)"], ["bonusPerf", "Bonus performance (KPI ≥ 90%)"], ["bonusZero", "Bonus zero complain"], ["bonusLain", "Bonus lain"], ["bonusKet", "Keterangan bonus lain", "text"]] },
    { sec: "E. Lain-lain", f: [["backup", "Insentif backup"], ["lemburTambah", "Lembur tambahan (kontrak PKS)"], ["penggantiCuti", "Pengganti cuti / masuk hari off"], ["tip", "TIP dari customer"], ["lain", "Lain-lain"], ["lainKet", "Keterangan lain-lain", "text"], ["adjPlus", "Payroll adjustment (kurang bayar)"]] },
    { sec: "Benefit lain dari perusahaan", f: [["natura", "Makan natura"], ["emergency", "Emergency fund"]] },
    { sec: "Potongan lain", f: [["kasbonLunas", "Pelunasan kasbon"], ["kasbonCicil", "Cicilan kasbon"], ["loss", "Loss penalty (kerusakan/kerugian)"], ["penaltyResign", "Penalty resign sepihak"], ["penaltyKPI", "Penalty KPI & SLA"], ["angsuran", "Angsuran fasilitas"], ["potLain", "Potongan lain"], ["potKet", "Keterangan potongan lain", "text"], ["adjMinus", "Payroll adjustment (lebih bayar)"]] },
    { sec: "Keterangan di slip", f: [["mengganti", "Mengganti rekan (kali)"], ["performance", "Nilai performance", "text"], ["catatan", "Catatan", "text"]] }
  ];
  const tarifRow = (c, p) => cfg.tarif.find((t) => t.cabang === c && t.posisi === p);
  function bulanIni(key) { const b = cfg.bulanan[hasil ? hasil.periode : ""] || {}; return b[key] || {}; }

  function hcRate(j) { return cfg.hcTarif.find((t) => j >= +t.min && j <= +t.max) || cfg.hcTarif[cfg.hcTarif.length - 1] || { bagi: 0, makan: 0, trans: 0 }; }
  function hitungGaji(r, periode) {
    const t = tarifRow(r.Cabang, r.Posisi) || TARIF_KOSONG;
    const P = cfg.pegawai[r.key] || {}, M = (cfg.bulanan[periode] || {})[r.key] || {};
    const v = (x) => +x || 0, ov = (o, b) => isNum(o) ? +o : v(b);
    const g = { gaji: ov(P.oGaji, t.gaji), tunjMT: ov(P.oTunjMT, t.tunjMT), tunjKin: ov(P.oTunjKin, t.tunjKin), tunjAbs: ov(P.oTunjAbs, t.tunjAbs) };
    const tanpaJadwal = list(cfg.tanpaJadwal).includes(r.Cabang);
    // order home cleaning: dari absensi (lokasi tanpa jadwal) + order manual
    const orders = (tanpaJadwal ? r.detail.filter((d) => d.Status === "Present" && d["Jam Kerja"] > 0).map((d) => Math.max(1, Math.round(d["Jam Kerja"]))) : [])
      .concat(String(M.hcOrders || "").split(/[,;\s]+/).map((x) => Math.round(+x.replace(",", "."))).filter((x) => x > 0));
    const hc = orders.reduce((a, j) => { const k = hcRate(j); a.jam += j; a.bagi += j * (+k.bagi || 0); a.makan += +k.makan || 0; a.trans += +k.trans || 0; return a; }, { jam: 0, bagi: 0, makan: 0, trans: 0 });
    // masa kerja & prorata
    const inMasa = (d) => (!M.tglMasuk || d.Tanggal >= M.tglMasuk) && (!M.tglKeluar || d.Tanggal <= M.tglKeluar);
    const jadwal = r.detail.filter((d) => d.Status !== "Off");
    const jadwalMasa = jadwal.filter(inMasa);
    const absenMasa = jadwalMasa.filter((d) => d.Status === "Absent").length, izinMasa = jadwalMasa.filter((d) => d.Status === "Izin").length;
    const dibayar = jadwalMasa.filter((d) => ["Present", "Sakit", "Cuti"].includes(d.Status)).length;
    const prorata = cfg.metodeGaji === "prorata" && !tanpaJadwal;
    let faktor = 1, ketProrata = "";
    if (jadwal.length && prorata) { faktor = Math.min(1, dibayar / jadwal.length); ketProrata = `prorata ${dibayar}/${jadwal.length} hari`; }
    else if (jadwal.length && (M.tglMasuk || M.tglKeluar)) { faktor = jadwalMasa.length / jadwal.length; ketProrata = `prorata masa kerja ${jadwalMasa.length}/${jadwal.length} hari`; }
    const ada = g.gaji > 0 || tanpaJadwal;
    const d = cfg.dasarHarian || {};
    const harian = ((d.gaji ? g.gaji : 0) + (d.tunjMT ? g.tunjMT : 0) + (d.tunjKin ? g.tunjKin : 0) + (d.tunjAbs ? g.tunjAbs : 0)) / (cfg.pembagi || 26);
    const fx = (x) => Math.round(x * faktor);
    const pend = [
      { sec: "A. Penempatan", info: faktor < 1 ? ketProrata : "", items: [["Gaji pokok", fx(g.gaji)], ["Tunjangan makan & transport", fx(g.tunjMT)], ["Tunjangan kinerja", fx(g.tunjKin)], ["Tunjangan absensi", fx(g.tunjAbs)]] },
      { sec: "B. Home Cleaning", info: orders.length ? `${orders.length} order · ${hc.jam} jam` : "", items: [["Imbal bagi hasil", hc.bagi + v(M.hcBagi)], ["Tunjangan makan", hc.makan + v(M.hcMakan)], ["Tunjangan transport", hc.trans + v(M.hcTrans)]] },
      { sec: "C. Project", items: [["Imbal bagi hasil", v(M.pjBagi)], ["Tunjangan makan", v(M.pjMakan)], ["Tunjangan transport", v(M.pjTrans)], ["Tunjangan kinerja", v(M.pjKin)]] },
      { sec: "D. Additional performance", items: [["Insentif Jaspro", v(M.jaspro)], ["Bonus performance", v(M.bonusPerf)], ["Bonus zero complain", v(M.bonusZero)], [M.bonusKet ? `Bonus lain (${M.bonusKet})` : "Bonus lain", v(M.bonusLain)]] },
      { sec: "E. Lain-lain", items: [["Insentif backup", v(M.backup)], [`Lembur (${jam(r.LemburJam)})`, r.LemburUpah], ["Lembur tambahan (PKS)", v(M.lemburTambah)],
        [`Insentif mengganti (${r.Double}× double shift)`, r.Double * cfg.bonusDouble], ["Add-on benefit", v(P.addOn)], ["Pengganti cuti", v(M.penggantiCuti)],
        ["TIP dari customer", v(M.tip)], [M.lainKet ? `Lain-lain (${M.lainKet})` : "Lain-lain", v(M.lain)], ["Payroll adjustment (kurang bayar)", v(M.adjPlus)]] }
    ];
    pend.forEach((x) => { x.total = x.items.reduce((a2, it) => a2 + it[1], 0); });
    const pot = [
      ["Iuran BPJS Kesehatan", v(P.iuranKes)], ["Iuran BPJS Ketenagakerjaan", v(P.iuranTK)],
      ["Pelunasan kasbon", v(M.kasbonLunas)], ["Cicilan kasbon", v(M.kasbonCicil)],
      [`Keterlambatan (${r.TelatKenaKali}×)`, r.TelatPot], [`Pulang cepat (${r.PcMnt} mnt)`, r.PcMnt * cfg.pulangPerMenit],
      [`Wanprestasi / tanpa keterangan (${absenMasa} hari)`, ada && !prorata ? harian * absenMasa : 0], [`Off di luar tanggungan / izin (${izinMasa} hari)`, ada && !prorata ? harian * izinMasa : 0],
      ["Loss penalty", v(M.loss)], ["Admin & payroll", ada ? v(t.admin) : 0], ["Penalty resign sepihak", v(M.penaltyResign)],
      ["Penalty KPI & SLA", v(M.penaltyKPI)], ["Angsuran fasilitas", v(M.angsuran)], [M.potKet ? `Potongan lain (${M.potKet})` : "Potongan lain", v(M.potLain)], ["Payroll adjustment (lebih bayar)", v(M.adjMinus)]
    ].map((x) => [x[0], Math.round(x[1])]);
    const ben = [["BPJS Kesehatan", v(P.benKes)], ["BPJS Ketenagakerjaan", v(P.benTK)], ["Makan natura", v(M.natura)], ["Emergency fund", v(M.emergency)]];
    const bruto = pend.reduce((a2, x) => a2 + x.total, 0), potongan = pot.reduce((a2, x) => a2 + x[1], 0), benefit = ben.reduce((a2, x) => a2 + x[1], 0);
    return { g, ada, harian, pend, pot, ben, bruto, potongan, benefit, thp: bruto - potongan, P, M, admin: v(t.admin), faktor, ketProrata, orders, hc, tanpaJadwal };
  }

  // ---------- hitung bulanan ----------
  function hitung(rows) {
    const shifts = prepShifts(), alias = aliasMap(), tetap = list(cfg.tetap);
    const det = rows.map((r) => applyAdj(hitungHari(r, shifts, alias, tetap)));
    det.sort((a, b) => a.Nama.localeCompare(b.Nama) || a.Tanggal.localeCompare(b.Tanggal));
    const tglList = [...new Set(det.map((d) => d.Tanggal))].sort();
    const periode = tglList[0].slice(0, 7);

    const grup = new Map();
    det.forEach((d) => { if (!grup.has(d.key)) grup.set(d.key, []); grup.get(d.key).push(d); });
    const rekap = [];
    grup.forEach((gr, key) => {
      const f = gr[0];
      const st = (s) => gr.filter((d) => d.Status === s);
      const hadir = st("Present");
      const telat = hadir.filter((d) => d["Telat (mnt)"] > 0), pc = hadir.filter((d) => d["Pulang Cepat (mnt)"] > 0);
      const sum = (arr, k) => arr.reduce((s, d) => s + (+d[k] || 0), 0);
      const r = {
        key, Nama: f.Nama, NIP: f.NIP, Cabang: f.Cabang, Posisi: f.Posisi, detail: gr,
        Hadir: hadir.length, Absen: st("Absent").length, Izin: st("Izin").length, Sakit: st("Sakit").length, Cuti: st("Cuti").length, Off: st("Off").length,
        TidakCI: gr.filter((d) => d.rawStatus === "Absent").length, TidakCO: hadir.filter((d) => d.tidakCO).length,
        TelatKali: telat.length, TelatMnt: sum(telat, "Telat (mnt)"), TelatKenaKali: hadir.filter((d) => d["Potongan Telat (Rp)"] > 0).length, TelatPot: sum(hadir, "Potongan Telat (Rp)"),
        PcKali: pc.length, PcMnt: sum(pc, "Pulang Cepat (mnt)"),
        LemburJam: sum(hadir, "Lembur Dibayar (jam)"), LemburUpah: sum(hadir, "Upah Lembur (Rp)"),
        LemburTakDibayarJam: hadir.filter((d) => d["Lembur Dibayar (jam)"] === 0 && d["Lembur (mnt)"] >= cfg.lemburMin && !(d.adj && isNum(d.adj.lembur))).reduce((s, d) => s + d["Lembur (mnt)"], 0) / 60,
        Double: hadir.filter((d) => d["Double Shift"] === "ya").length,
        ShiftBerubah: hadir.filter((d) => d["Status Shift"].startsWith("shift berubah")).length,
        TelatHris: sum(hadir, "Telat HRIS (mnt)"), Dikoreksi: gr.filter((d) => d.adj).length
      };
      r.Terjadwal = r.Hadir + r.Absen + r.Izin + r.Sakit + r.Cuti;
      const s = hitungGaji(r, periode);
      r.slip = s;
      r.adaTarif = s.ada; r.gaji = s.g.gaji; r.Pendapatan = s.bruto; r.Potongan = s.potongan;
      r.PotAbsen = s.ada ? s.harian * (r.Absen + r.Izin) : 0;
      r.GajiBersih = s.ada ? Math.max(0, s.thp) : null; r.Minus = s.ada && s.thp < 0;
      r.Mengganti = r.Double + (+s.M.mengganti || 0);
      r.Jabatan = s.P.jabatan || r.Posisi; r.StatusKerja = s.P.status || "";
      r.Biaya = s.bruto + s.benefit; r.Benefit = s.benefit; r.TanpaJadwal = s.tanpaJadwal; r.Order = s.orders.length; r.OrderJam = s.hc.jam;
      rekap.push(r);
    });

    [...rekap].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama)).forEach((r, i) => { r.NoSlip = `SG/${periode.slice(0, 4)}/${periode.slice(5, 7)}/${String(i + 1).padStart(3, "0")}`; });
    const review = [];
    det.forEach((d) => { if (d._review.length) review.push({ key: d.key, Tanggal: d.Tanggal, Nama: d.Nama, NIP: d.NIP, Cabang: d.Cabang, "Jadwal HRIS": d["Jadwal HRIS"], "Check In": d["Check In"], "Check Out": d["Check Out"], Alasan: d._review.join("; ") }); });
    rekap.forEach((r) => { if (r.Hadir === 0 && r.Absen > 0) review.push({ key: r.key, Tanggal: "", Nama: r.Nama, NIP: r.NIP, Cabang: r.Cabang, "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "Tidak pernah hadir sebulan penuh (" + r.Absen + " hari tanpa keterangan): resign, belum pakai aplikasi, atau cuti?" }); });
    const nipNama = new Map();
    rows.forEach((r) => { if (!nipNama.has(r.nip)) nipNama.set(r.nip, new Set()); nipNama.get(r.nip).add(r.nama); });
    nipNama.forEach((v, nip) => {
      if (nip && nip !== "0" && v.size > 1) review.push({ Tanggal: "", Nama: [...v].join(", "), NIP: nip, Cabang: "", "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "NIP dipakai lebih dari satu orang, rapikan di HRIS" });
      if (!nip || nip === "0") v.forEach((n) => review.push({ Tanggal: "", Nama: n, NIP: nip, Cabang: "", "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "NIP kosong/0, lengkapi di HRIS" }));
    });
    return { det, rekap, review, periode, tanggal: tglList, dari: tglList[0], sampai: tglList[tglList.length - 1] };
  }

  function terbilang(n) {
    const s = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    const f = (x) => x < 12 ? s[x] : x < 20 ? f(x - 10) + " belas" : x < 100 ? f(Math.floor(x / 10)) + " puluh " + f(x % 10)
      : x < 200 ? "seratus " + f(x - 100) : x < 1000 ? f(Math.floor(x / 100)) + " ratus " + f(x % 100)
      : x < 2000 ? "seribu " + f(x - 1000) : x < 1e6 ? f(Math.floor(x / 1000)) + " ribu " + f(x % 1000)
      : x < 1e9 ? f(Math.floor(x / 1e6)) + " juta " + f(x % 1e6) : f(Math.floor(x / 1e9)) + " miliar " + f(x % 1e9);
    const t = f(Math.floor(Math.abs(n))).replace(/\s+/g, " ").trim();
    return t ? t[0].toUpperCase() + t.slice(1) + " rupiah" : "Nol rupiah";
  }
