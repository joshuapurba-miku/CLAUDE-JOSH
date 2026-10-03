
  // ---------- koreksi manual per hari ----------
  const STATUS_ADJ = { hadir: "Present", telat: "Present", absen: "Absent", izin: "Izin", sakit: "Sakit", cuti: "Cuti", off: "Off", na: "NA" };
  const STATUS_LABEL = { Present: "Hadir", Absent: "Tanpa keterangan", Izin: "Izin (dipotong)", Sakit: "Sakit (dibayar)", Cuti: "Cuti (dibayar)", Off: "Off / libur", OffMasuk: "Masuk di hari off", NA: "Belum aktif / sudah keluar" };
  const isNum = (x) => x !== undefined && x !== null && x !== "" && !isNaN(+x);
  const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  function kodeHari(o) {
    if (o.Status === "Present") return o["Telat (mnt)"] > cfg.telatAmbang ? "T" : "H";
    return { Absent: "A", Izin: "I", Sakit: "S", Cuti: "C", Off: "O", OffMasuk: "M", NA: "N" }[o.Status] || "O";
  }
  function kosongkanHari(o) {
    o["Telat (mnt)"] = 0; o["Pulang Cepat (mnt)"] = 0; o["Lembur Dibayar (jam)"] = 0; o["Upah Lembur (Rp)"] = 0; o.tidakCO = false;
    o["Double Shift"] = ""; o.Extend = "";
  }
  function applyAdj(o) {
    o.auto = { status: o.Status, telat: o["Telat (mnt)"], lembur: o["Lembur Dibayar (jam)"], lemburMnt: o["Lembur (mnt)"] };
    const a = cfg.adj[o.key + "|" + o.Tanggal];
    if (a) {
      o.adj = a;
      if (a.status && STATUS_ADJ[a.status]) {
        const ns = STATUS_ADJ[a.status];
        if (ns !== "Present") kosongkanHari(o);
        o.Status = ns;
        if (a.status === "telat" && !isNum(a.telat)) o["Telat (mnt)"] = Math.max(o["Telat (mnt)"], cfg.telatAmbang + 1);
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
  function jadikanNA(o, ket) {
    kosongkanHari(o); o["Potongan Telat (Rp)"] = 0;
    o.Status = "NA"; o.Kode = "N"; o._review = []; o.Catatan.push(ket);
  }

  // ---------- komponen gaji ----------
  const OPSI_BPJS = [["", "Tidak ikut"], ["aktif", "Aktif (dipotong iuran)"], ["tunai", "Tidak mau diaktifkan: dibayar tunai"]];
  const F_TETAP = [
    ["jabatan", "Jabatan / level", "text", "dl-jab"], ["status", "Status kerja", "text", "dl-status"],
    ["oGaji", "Gaji pokok khusus"], ["oTunjMT", "Tunj. makan & transport khusus"], ["oTunjKin", "Tunj. kinerja khusus"], ["oTunjAbs", "Tunj. kehadiran khusus"],
    ["bpjsKes", "BPJS Kesehatan", "select", OPSI_BPJS], ["bpjsTK", "BPJS Ketenagakerjaan", "select", OPSI_BPJS],
    ["bpjsDasar", "Dasar upah BPJS (kosong = UMK)"],
    ["iuranKes", "Iuran BPJS Kesehatan manual (kosong = otomatis)"], ["iuranTK", "Iuran BPJS Ketenagakerjaan manual (kosong = otomatis)"],
    ["benKes", "BPJS Kesehatan perusahaan manual (kosong = otomatis)"], ["benTK", "BPJS Ketenagakerjaan perusahaan manual (kosong = otomatis)"],
    ["addOn", "Add-on benefit lain"],
    ["bank", "Bank", "text", "dl-bank"], ["noRek", "No. rekening", "text"], ["atasNama", "Atas nama rekening", "text"]
  ];
  const F_BULAN = [
    { sec: "Masa kerja bulan ini", hint: "Isi jika pegawai baru masuk (belum aktif sebulan penuh) atau berhenti di tengah bulan. Hari di luar masa kerja ditandai N (belum aktif / sudah keluar) dan gaji dihitung prorata: hari aktif ÷ pembagi hari kerja.", f: [["tglMasuk", "Mulai kerja tanggal", "date"], ["tglKeluar", "Berhenti tanggal", "date"]] },
    { sec: "B. Home Cleaning", hint: "Isi jam tiap order di luar absensi, pisahkan koma (misal: 5, 8, 3). Bagi hasil, makan, dan transport dihitung dari tabel tarif home cleaning di Pengaturan.", f: [["hcOrders", "Order (jam per order)", "text"], ["hcBagi", "Bagi hasil tambahan"], ["hcMakan", "Tunj. makan tambahan"], ["hcTrans", "Tunj. transport tambahan"]] },
    { sec: "C. Project", f: [["pjBagi", "Imbal bagi hasil"], ["pjMakan", "Tunjangan makan"], ["pjTrans", "Tunjangan transport"], ["pjKin", "Tunjangan kinerja"]] },
    { sec: "D. Additional performance", f: [["jaspro", "Insentif Jaspro (referral)"], ["bonusPerf", "Bonus performance (KPI ≥ 90%)"], ["bonusZero", "Bonus zero complain"], ["bonusLain", "Bonus lain"], ["bonusKet", "Keterangan bonus lain", "text"]] },
    { sec: "E. Lain-lain", hint: "Backup dan insentif mengganti (extend shift, masuk di hari off) dihitung otomatis. Kolom di sini hanya untuk tambahan di luar itu.", f: [["subsidi", "Subsidi tambahan"], ["adjPlus", "Kekurangan bayar bulan lalu"], ["backup", "Insentif backup tambahan (manual)"], ["lemburTambah", "Lembur tambahan (kontrak PKS)"], ["penggantiCuti", "Pengganti cuti"], ["tip", "TIP dari customer"], ["lain", "Lain-lain"], ["lainKet", "Keterangan lain-lain", "text"]] },
    { sec: "Benefit lain dari perusahaan", f: [["natura", "Makan natura"], ["emergency", "Emergency fund"]] },
    { sec: "Potongan lain", f: [["kasbonLunas", "Pelunasan kasbon"], ["kasbonCicil", "Cicilan kasbon"], ["loss", "Loss penalty (kerusakan/kerugian)"], ["penaltyResign", "Penalty resign sepihak"], ["penaltyKPI", "Penalty KPI & SLA"], ["angsuran", "Angsuran fasilitas"], ["potLain", "Potongan lain"], ["potKet", "Keterangan potongan lain", "text"], ["adjMinus", "Payroll adjustment (lebih bayar)"]] },
    { sec: "Keterangan di slip", f: [["mengganti", "Mengganti rekan (kali, keterangan saja)"], ["performance", "Nilai performance", "text"], ["catatan", "Catatan", "text"]] }
  ];
  const tarifRow = (c, p) => cfg.tarif.find((t) => t.cabang === c && t.posisi === p);
  function bulanIni(key) { const b = cfg.bulanan[hasil ? hasil.periode : ""] || {}; return b[key] || {}; }

  function hcRate(j) { return cfg.hcTarif.find((t) => j >= +t.min && j <= +t.max) || cfg.hcTarif[cfg.hcTarif.length - 1] || { bagi: 0, makan: 0, trans: 0 }; }
  function harianDari(g) {
    const d = cfg.dasarHarian || {};
    return ((d.gaji ? +g.gaji || 0 : 0) + (d.tunjMT ? +g.tunjMT || 0 : 0) + (d.tunjKin ? +g.tunjKin || 0 : 0) + (d.tunjAbs ? +g.tunjAbs || 0 : 0)) / (cfg.pembagi || 26);
  }
  // upah harian sesuai tarif lokasi (dipakai untuk backup di lokasi itu)
  function harianLokasi(cabang, posisi) {
    const t = tarifRow(cabang, posisi) || cfg.tarif.find((x) => x.cabang === cabang && +x.gaji > 0) || TARIF_KOSONG;
    return harianDari(t);
  }
  // upah harian pegawai sendiri (tarif lokasi & posisinya + gaji khusus jika diisi)
  function harianPegawai(key, cabang, posisi) {
    const t = tarifRow(cabang, posisi) || TARIF_KOSONG, P = cfg.pegawai[key] || {}, ov = (o, b) => isNum(o) ? +o : (+b || 0);
    return harianDari({ gaji: ov(P.oGaji, t.gaji), tunjMT: ov(P.oTunjMT, t.tunjMT), tunjKin: ov(P.oTunjKin, t.tunjKin), tunjAbs: ov(P.oTunjAbs, t.tunjAbs) });
  }
  function hitungBPJS(P) {
    const B = cfg.bpjs || {}, base = isNum(P.bpjsDasar) ? +P.bpjsDasar : (+B.umk || 0);
    const pc = (x) => Math.round(base * (+x || 0) / 100), ov = (o, b) => isNum(o) ? +o : b;
    const status = (s, lama) => s || (lama ? "aktif" : "");
    return {
      base,
      kes: status(P.bpjsKes, isNum(P.iuranKes) || isNum(P.benKes)), tk: status(P.bpjsTK, isNum(P.iuranTK) || isNum(P.benTK)),
      kesPekerja: ov(P.iuranKes, pc(B.kesPekerja)), kesPerusahaan: ov(P.benKes, pc(B.kesPerusahaan)),
      tkPekerja: ov(P.iuranTK, pc(+B.jhtPekerja + +B.jpPekerja)), tkPerusahaan: ov(P.benTK, pc(+B.jhtPerusahaan + +B.jpPerusahaan + +B.jkk + +B.jkm))
    };
  }
  const sebutBank = (b) => String(b || "").toLowerCase().replace(/^bank\s+/, "").replace(/\s+/g, "");
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
    // hari aktif & prorata
    const pembagi = cfg.pembagi || 26;
    const aktif = r.detail.filter((d) => d.Status !== "NA"), sebagian = aktif.length < r.detail.length;
    const jadwal = aktif.filter((d) => d.Status !== "Off" && d.Status !== "OffMasuk");
    const absenN = jadwal.filter((d) => d.Status === "Absent").length, izinN = jadwal.filter((d) => d.Status === "Izin").length;
    const dibayar = jadwal.filter((d) => ["Present", "Sakit", "Cuti"].includes(d.Status)).length;
    const prorata = cfg.metodeGaji === "prorata" && !tanpaJadwal && r.detail.length > 0;
    const faktorAktif = sebagian ? Math.min(1, jadwal.length / pembagi) : 1;
    let faktor = 1, ketProrata = "";
    if (prorata) { const dasar = sebagian ? pembagi : jadwal.length; faktor = dasar ? Math.min(1, dibayar / dasar) : 0; ketProrata = `prorata ${dibayar}/${dasar} hari`; }
    else if (sebagian) { faktor = faktorAktif; ketProrata = `aktif ${jadwal.length} dari ${pembagi} hari`; }
    const ada = g.gaji > 0 || tanpaJadwal || !!r.Luar;
    const harian = harianDari(g);
    const fx = (x) => Math.round(x * faktor);
    // tunjangan kehadiran: penuh jika hadir tepat waktu >= syarat (syarat & nilai prorata untuk yang belum aktif sebulan)
    const tepat = jadwal.filter((d) => d.Status === "Present" && d.Kode === "H").length;
    const syarat = Math.min(jadwal.length, sebagian ? Math.ceil((+cfg.kehadiranMin || 25) * faktorAktif) : (+cfg.kehadiranMin || 25));
    const pakaiAturanHadir = r.detail.length > 0 && !tanpaJadwal;
    const lolosHadir = pakaiAturanHadir && jadwal.length > 0 && tepat >= syarat;
    const tunjHadir = pakaiAturanHadir ? (lolosHadir ? Math.round(g.tunjAbs * faktorAktif) : 0) : fx(g.tunjAbs);
    const ketHadir = pakaiAturanHadir && g.tunjAbs ? `tepat waktu ${tepat}/${syarat} hari${lolosHadir ? "" : ", tidak memenuhi"}` : "";
    // insentif mengganti: extend shift + masuk di hari off, prorata upah harian
    const nExtend = tanpaJadwal ? 0 : r.detail.filter((d) => d.Status === "Present" && d["Double Shift"] === "ya").length;
    const nOffMasuk = tanpaJadwal ? 0 : r.detail.filter((d) => d.Status === "OffMasuk" && !d.dipakaiBackup).length;
    const mengganti = Math.round((nExtend + nOffMasuk) * harian);
    const ketGanti = [nExtend ? nExtend + "× extend" : "", nOffMasuk ? nOffMasuk + "× masuk hari off" : ""].filter(Boolean).join(", ");
    // BPJS
    const bp = hitungBPJS(P);
    const bpjsTunai = (bp.kes === "tunai" ? bp.kesPerusahaan : 0) + (bp.tk === "tunai" ? bp.tkPerusahaan : 0);
    const iuranKes = bp.kes === "aktif" ? bp.kesPekerja : 0, iuranTK = bp.tk === "aktif" ? bp.tkPekerja : 0;
    // backup per lokasi
    const backupPer = {};
    (r.BackupList || []).forEach((o) => { backupPer[o.cabang || "Lokasi lain"] = (backupPer[o.cabang || "Lokasi lain"] || 0) + o.upahPakai; });
    const infoA = [faktor < 1 ? ketProrata : "", ketHadir].filter(Boolean).join(" · ");
    const pend = [
      { sec: "A. Penempatan", info: infoA, items: [["Gaji pokok", fx(g.gaji)], ["Tunjangan makan & transport", fx(g.tunjMT)], ["Tunjangan kinerja", fx(g.tunjKin)], ["Tunjangan kehadiran", tunjHadir]] },
      { sec: "B. Home Cleaning", info: orders.length ? `${orders.length} order · ${hc.jam} jam` : "", items: [["Imbal bagi hasil", hc.bagi + v(M.hcBagi)], ["Tunjangan makan", hc.makan + v(M.hcMakan)], ["Tunjangan transport", hc.trans + v(M.hcTrans)]] },
      { sec: "C. Project", items: [["Imbal bagi hasil", v(M.pjBagi)], ["Tunjangan makan", v(M.pjMakan)], ["Tunjangan transport", v(M.pjTrans)], ["Tunjangan kinerja", v(M.pjKin)]] },
      { sec: "D. Additional performance", items: [["Insentif Jaspro", v(M.jaspro)], ["Bonus performance", v(M.bonusPerf)], ["Bonus zero complain", v(M.bonusZero)], [M.bonusKet ? `Bonus lain (${M.bonusKet})` : "Bonus lain", v(M.bonusLain)]] },
      { sec: "E. Lain-lain", items: [
        ...Object.keys(backupPer).sort().map((c) => [`Backup ${c}`, backupPer[c]]),
        ["Insentif backup (manual)", v(M.backup)],
        [`Insentif mengganti${ketGanti ? " (" + ketGanti + ")" : ""}`, mengganti],
        [`Lembur (${jam(r.LemburJam)})`, r.LemburUpah], ["Lembur tambahan (PKS)", v(M.lemburTambah)],
        ["Benefit BPJS dibayar tunai", bpjsTunai], ["Subsidi tambahan", v(M.subsidi)], ["Add-on benefit", v(P.addOn)], ["Pengganti cuti", v(M.penggantiCuti)],
        ["TIP dari customer", v(M.tip)], [M.lainKet ? `Lain-lain (${M.lainKet})` : "Lain-lain", v(M.lain)], ["Kekurangan bayar bulan lalu", v(M.adjPlus)]] }
    ];
    pend.forEach((x) => { x.total = x.items.reduce((a2, it) => a2 + it[1], 0); });
    const potAbsen = ada && !prorata ? Math.round(harian * absenN) : 0, potIzin = ada && !prorata ? Math.round(harian * izinN) : 0;
    const transfer = ada && cfg.bankPerusahaan && P.bank && sebutBank(P.bank) !== sebutBank(cfg.bankPerusahaan) ? v(cfg.biayaTransfer) : 0;
    const admin = ada ? v(cfg.biayaAdmin) : 0;
    const pot = [
      ["Iuran BPJS Kesehatan", iuranKes], ["Iuran BPJS Ketenagakerjaan", iuranTK],
      ["Pelunasan kasbon", v(M.kasbonLunas)], ["Cicilan kasbon", v(M.kasbonCicil)],
      [`Keterlambatan (${r.TelatKenaKali}×)`, r.TelatPot], [`Pulang cepat (${r.PcMnt} mnt)`, r.PcMnt * cfg.pulangPerMenit],
      [`Wanprestasi / tanpa keterangan (${absenN} hari)`, potAbsen], [`Off di luar tanggungan / izin (${izinN} hari)`, potIzin],
      ["Loss penalty", v(M.loss)], ["Admin & payroll", admin], ["Penalty resign sepihak", v(M.penaltyResign)],
      ["Penalty KPI & SLA", v(M.penaltyKPI)], ["Angsuran fasilitas", v(M.angsuran)], [M.potKet ? `Potongan lain (${M.potKet})` : "Potongan lain", v(M.potLain)], ["Payroll adjustment (lebih bayar)", v(M.adjMinus)],
      ["Biaya transfer antar bank", transfer]
    ].map((x) => [x[0], Math.round(x[1])]);
    const ben = [["BPJS Kesehatan", bp.kes === "aktif" ? bp.kesPerusahaan : 0], ["BPJS Ketenagakerjaan", bp.tk === "aktif" ? bp.tkPerusahaan : 0], ["Makan natura", v(M.natura)], ["Emergency fund", v(M.emergency)]];
    const bruto = pend.reduce((a2, x) => a2 + x.total, 0), potongan = pot.reduce((a2, x) => a2 + x[1], 0), benefit = ben.reduce((a2, x) => a2 + x[1], 0);
    const kol = {
      gajiLapangan: pend[0].total - tunjHadir, tunjHadir, backupPer, backupManual: v(M.backup), mengganti, hc: pend[1].total,
      lembur: r.LemburUpah + v(M.lemburTambah), bonus: pend[2].total + pend[3].total + v(P.addOn) + v(M.penggantiCuti) + v(M.tip) + v(M.lain),
      kurang: v(M.adjPlus), bpjsTunai, subsidi: v(M.subsidi), bruto,
      admin, potBpjs: iuranKes + iuranTK, penalty: Math.round(r.TelatPot + r.PcMnt * cfg.pulangPerMenit + v(M.loss) + v(M.penaltyResign) + v(M.penaltyKPI)),
      potAbsen: potAbsen + potIzin, potLain: v(M.kasbonLunas) + v(M.kasbonCicil) + v(M.angsuran) + v(M.potLain) + v(M.adjMinus), transfer
    };
    return { g, ada, harian, pend, pot, ben, bruto, potongan, benefit, thp: bruto - potongan, P, M, admin, faktor, ketProrata, orders, hc, tanpaJadwal, kol, bp, nExtend, nOffMasuk, tepat, syarat };
  }

  // ---------- pegawai tambahan dengan absensi manual ----------
  function hariManual(p, tgl) {
    const masa = (!p.mulai || tgl >= p.mulai) && (!p.selesai || tgl <= p.selesai);
    return {
      Tanggal: tgl, Hari: HARI_ID[new Date(tgl + "T00:00:00Z").getUTCDay()], Nama: p.nama, NIP: p.nip || "", Cabang: p.cabang || "Di luar Kolabo", Posisi: p.posisi || "",
      "Jadwal HRIS": "", "Shift Aktual": p.shift || "", "Status Shift": "input manual",
      "Check In": "", "Check Out": "", Status: masa ? "Present" : "NA", "Telat (mnt)": 0, "Pulang Cepat (mnt)": 0,
      "Lembur (mnt)": 0, "Lembur Dibayar (jam)": 0, "Upah Lembur (Rp)": 0, "Potongan Telat (Rp)": 0,
      "Jam Kerja": 0, "Double Shift": "", "Telat HRIS (mnt)": 0, Catatan: [masa ? "pegawai tambahan, absensi diisi manual" : "di luar masa kerja"], _review: [],
      key: "LUAR:" + p.id, rawStatus: masa ? "Present" : "NA", tidakCO: false, lemburTarif: tarifLembur(p.cabang, tgl, p.nip), manual: true
    };
  }

  // ---------- hitung bulanan ----------
  function hitung(rows) {
    const shifts = prepShifts(), alias = aliasMap(), tetap = list(cfg.tetap);
    const det0 = rows.map((r) => hitungHari(r, shifts, alias, tetap));
    const tglList = [...new Set(det0.map((d) => d.Tanggal))].sort();
    const periode = tglList[0].slice(0, 7), dari = tglList[0], sampai = tglList[tglList.length - 1];
    // pegawai di luar Kolabo: dengan masa kerja → punya absensi harian; tanpa → backup / home cleaning / freelance
    const luarSemua = (cfg.pegawaiLuar || []).filter((p) => p.aktif !== false && p.nama);
    const punyaAbsen = (p) => p.mulai || p.selesai;
    const luarAbsen = luarSemua.filter((p) => punyaAbsen(p) && (!p.mulai || p.mulai <= sampai) && (!p.selesai || p.selesai >= dari));
    const luar = luarSemua.filter((p) => !punyaAbsen(p));
    luarAbsen.forEach((p) => tglList.forEach((t) => det0.push(hariManual(p, t))));
    const det = det0.map(applyAdj);
    // masa kerja dari Input Gaji: hari di luar masa = belum aktif / sudah keluar
    const bul = cfg.bulanan[periode] || {};
    det.forEach((d) => {
      const M = bul[d.key];
      if (!M || (d.adj && d.adj.status)) return;
      if (M.tglMasuk && d.Tanggal < M.tglMasuk) jadikanNA(d, "belum aktif (mulai " + M.tglMasuk + ")");
      else if (M.tglKeluar && d.Tanggal > M.tglKeluar) jadikanNA(d, "sudah keluar (berhenti " + M.tglKeluar + ")");
    });
    det.sort((a, b) => a.Nama.localeCompare(b.Nama) || a.Tanggal.localeCompare(b.Tanggal));

    const grup = new Map();
    det.forEach((d) => { if (!grup.has(d.key)) grup.set(d.key, []); grup.get(d.key).push(d); });
    const infoKey = (k) => { if (grup.has(k)) { const f = grup.get(k)[0]; return { nama: f.Nama, cabang: f.Cabang, posisi: f.Posisi, luar: false }; } const p = luar.find((x) => "LUAR:" + x.id === k); return p ? { nama: p.nama, cabang: p.cabang, posisi: p.posisi, luar: true } : null; };
    // jadwal backup: pengganti dibayar sesuai tarif harian lokasi tempat dia backup
    const dMap = new Map(det.map((d) => [d.key + "|" + d.Tanggal, d]));
    const bkUpah = {}, backup = [], dobel = {};
    (cfg.backup[periode] || []).forEach((bk, i) => {
      const o = Object.assign({ idx: i }, bk), alasan = [];
      const pg = infoKey(bk.pengganti), dg = bk.diganti && grup.has(bk.diganti) ? grup.get(bk.diganti)[0] : null;
      const d = dg ? dMap.get(bk.diganti + "|" + bk.tgl) : null;
      o.namaPengganti = pg ? pg.nama : "(belum dipilih)"; o.namaDiganti = dg ? dg.Nama : ""; o.cabang = bk.lokasi || (dg ? dg.Cabang : "");
      o.asal = pg ? pg.cabang : "";
      o.lokasiSendiri = !!(pg && o.cabang && o.cabang === pg.cabang);
      o.harian = !o.cabang ? 0 : o.lokasiSendiri ? harianPegawai(bk.pengganti, pg.cabang, pg.posisi) : harianLokasi(o.cabang, dg ? dg.Posisi : (pg && pg.posisi) || "");
      o.upahPakai = isNum(bk.upah) ? +bk.upah : Math.round(o.harian);
      let sev = "ok";
      if (!bk.tgl || !pg || !o.cabang) { sev = "konflik"; alasan.push("lengkapi tanggal, pengganti, dan lokasi atau yang digantikan"); }
      else if (dg && bk.pengganti === bk.diganti) { sev = "konflik"; alasan.push("pengganti dan yang digantikan orang yang sama"); }
      else if (dg && !d) { sev = "konflik"; alasan.push(`tanggal ${bk.tgl} tidak ada di data absensi ${dg.Nama}`); }
      else {
        if (dg) {
          const k2 = bk.diganti + "|" + bk.tgl;
          if (dobel[k2]) { sev = "konflik"; alasan.push(`${dg.Nama} sudah dibackup oleh ${dobel[k2]} di tanggal yang sama`); }
          dobel[k2] = o.namaPengganti;
          o.statusDiganti = STATUS_LABEL[d.Status];
          if (d.Status === "Present") { sev = "konflik"; alasan.push(`${dg.Nama} tercatat HADIR: gaji dibayar dua kali. Koreksi absensinya atau hapus backup ini`); }
          else if (d.Status === "Sakit" || d.Status === "Cuti") { if (sev === "ok") sev = "perhatian"; alasan.push(`${dg.Nama} tetap dibayar (${d.Status.toLowerCase()}), backup juga dibayar`); }
          else if (d.Status === "Off") { if (sev === "ok") sev = "perhatian"; alasan.push(`hari ini jadwal off ${dg.Nama}`); }
          else if (d.Status === "NA") alasan.push(`${dg.Nama} belum aktif / sudah keluar`);
          else alasan.push(`${dg.Nama} ${d.Status === "Izin" ? "izin" : "tanpa keterangan"}, gajinya dipotong untuk hari ini`);
        } else alasan.push(`backup di ${o.cabang} tanpa menggantikan orang tertentu`);
        const dp = !pg.luar ? dMap.get(bk.pengganti + "|" + bk.tgl) : null;
        if (dp && dp.Status === "Present") { if (sev === "ok") sev = "perhatian"; alasan.push(`${pg.nama} juga bekerja di jadwalnya sendiri (double shift)`); }
        if (dp && (dp.Status === "Absent" || dp.Status === "Izin")) { if (sev === "ok") sev = "perhatian"; alasan.push(`${pg.nama} tercatat ${dp.Status === "Absent" ? "tanpa keterangan" : "izin"} di jadwalnya sendiri dan ikut dipotong. Ubah jadi Off di Rekap Absensi jika dia dipindah ke lokasi backup`); }
        if (sev !== "konflik") {
          if (dp && dp.Status === "OffMasuk") { dp.dipakaiBackup = true; dp._review = []; }
          if (dp) dp.backupKeluar = (dp.backupKeluar || []).concat([{ cabang: o.cabang, diganti: o.namaDiganti }]);
          if (d) { d.dibackup = (d.dibackup || []).concat([o.namaPengganti]); d.Catatan.push("dibackup oleh " + o.namaPengganti); }
        }
      }
      o.sev = sev; o.alasan = alasan.join("; ");
      if (sev !== "konflik") { const u = bkUpah[bk.pengganti] = bkUpah[bk.pengganti] || { n: 0, upah: 0, daftar: [] }; u.n++; u.upah += o.upahPakai; u.daftar.push(o); }
      backup.push(o);
    });
    const rekap = [];
    const buatRekap = (key, f, gr, isLuar) => {
      const st = (s) => gr.filter((d) => d.Status === s);
      const hadir = st("Present");
      const telat = hadir.filter((d) => d["Telat (mnt)"] > 0), pc = hadir.filter((d) => d["Pulang Cepat (mnt)"] > 0);
      const sum = (arr, k) => arr.reduce((s, d) => s + (+d[k] || 0), 0);
      const r = {
        key, Nama: f.Nama, NIP: f.NIP, Cabang: f.Cabang, Posisi: f.Posisi, detail: gr, Luar: isLuar, Manual: key.startsWith("LUAR:") && !isLuar,
        Hadir: hadir.length, Absen: st("Absent").length, Izin: st("Izin").length, Sakit: st("Sakit").length, Cuti: st("Cuti").length, Off: st("Off").length,
        OffMasuk: st("OffMasuk").length, NA: st("NA").length,
        TidakCI: gr.filter((d) => d.rawStatus === "Absent").length, TidakCO: hadir.filter((d) => d.tidakCO).length,
        TelatKali: telat.length, TelatMnt: sum(telat, "Telat (mnt)"), TelatKenaKali: hadir.filter((d) => d["Potongan Telat (Rp)"] > 0).length, TelatPot: sum(hadir, "Potongan Telat (Rp)"),
        PcKali: pc.length, PcMnt: sum(pc, "Pulang Cepat (mnt)"),
        LemburJam: sum(hadir, "Lembur Dibayar (jam)"), LemburUpah: sum(hadir, "Upah Lembur (Rp)"),
        LemburTakDibayarJam: hadir.filter((d) => d["Lembur Dibayar (jam)"] === 0 && d["Lembur (mnt)"] >= cfg.lemburMin && !(d.adj && isNum(d.adj.lembur))).reduce((s, d) => s + d["Lembur (mnt)"], 0) / 60,
        Double: hadir.filter((d) => d["Double Shift"] === "ya").length,
        ShiftBerubah: hadir.filter((d) => d["Status Shift"].startsWith("shift berubah")).length,
        TelatHris: sum(hadir, "Telat HRIS (mnt)"), Dikoreksi: gr.filter((d) => d.adj).length
      };
      const bu = bkUpah[key];
      r.BackupN = bu ? bu.n : 0; r.BackupUpah = bu ? bu.upah : 0; r.BackupList = bu ? bu.daftar : [];
      r.DibackupList = gr.filter((d) => d.dibackup).map((d) => ({ tgl: d.Tanggal, oleh: d.dibackup.join(", ") }));
      r.Terjadwal = r.Hadir + r.Absen + r.Izin + r.Sakit + r.Cuti;
      const s = hitungGaji(r, periode);
      r.slip = s;
      r.adaTarif = s.ada; r.gaji = s.g.gaji; r.Pendapatan = s.bruto; r.Potongan = s.potongan;
      r.PotAbsen = s.kol.potAbsen;
      r.GajiBersih = s.ada ? Math.max(0, s.thp) : null; r.Minus = s.ada && s.thp < 0;
      r.Mengganti = s.nExtend + s.nOffMasuk + (+s.M.mengganti || 0) + r.BackupN;
      r.Jabatan = s.P.jabatan || r.Posisi; r.StatusKerja = s.P.status || (isLuar || r.Manual ? "Di luar Kolabo" : "");
      r.Biaya = s.bruto + s.benefit; r.Benefit = s.benefit; r.TanpaJadwal = s.tanpaJadwal; r.Order = s.orders.length; r.OrderJam = s.hc.jam;
      rekap.push(r);
    };
    grup.forEach((gr, key) => { const f = gr[0]; buatRekap(key, { Nama: f.Nama, NIP: f.NIP, Cabang: f.Cabang, Posisi: f.Posisi }, gr, false); });
    luar.forEach((p) => buatRekap("LUAR:" + p.id, { Nama: p.nama, NIP: p.nip || "", Cabang: p.cabang || "Di luar Kolabo", Posisi: p.posisi || "Backup" }, [], true));

    [...rekap].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama)).forEach((r, i) => { r.NoSlip = `SG/${periode.slice(0, 4)}/${periode.slice(5, 7)}/${String(i + 1).padStart(3, "0")}`; });
    const review = [];
    det.forEach((d) => { if (d._review.length) review.push({ key: d.key, Tanggal: d.Tanggal, Nama: d.Nama, NIP: d.NIP, Cabang: d.Cabang, "Jadwal HRIS": d["Jadwal HRIS"], "Check In": d["Check In"], "Check Out": d["Check Out"], Alasan: d._review.join("; ") }); });
    backup.forEach((o) => { if (o.sev !== "ok") review.push({ key: o.diganti || o.pengganti, Tanggal: o.tgl || "", Nama: o.namaDiganti || o.namaPengganti, NIP: "", Cabang: o.cabang, "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: `Backup ${o.sev === "konflik" ? "BERMASALAH" : "perlu dicek"} (${o.namaPengganti}${o.namaDiganti ? " menggantikan " + o.namaDiganti : " di " + o.cabang}): ${o.alasan}` }); });
    rekap.forEach((r) => { if (r.Hadir === 0 && r.Absen > 0) review.push({ key: r.key, Tanggal: "", Nama: r.Nama, NIP: r.NIP, Cabang: r.Cabang, "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "Tidak pernah hadir sebulan penuh (" + r.Absen + " hari tanpa keterangan): resign, belum pakai aplikasi, atau cuti? Isi tanggal berhenti/mulai di Input Gaji." }); });
    const nipNama = new Map();
    rows.forEach((r) => { if (!nipNama.has(r.nip)) nipNama.set(r.nip, new Set()); nipNama.get(r.nip).add(r.nama); });
    nipNama.forEach((v, nip) => {
      if (nip && nip !== "0" && v.size > 1) review.push({ Tanggal: "", Nama: [...v].join(", "), NIP: nip, Cabang: "", "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "NIP dipakai lebih dari satu orang, rapikan di HRIS" });
      if (!nip || nip === "0") v.forEach((n) => review.push({ Tanggal: "", Nama: n, NIP: nip, Cabang: "", "Jadwal HRIS": "", "Check In": "", "Check Out": "", Alasan: "NIP kosong/0, lengkapi di HRIS" }));
    });
    return { det, rekap, review, backup, periode, tanggal: tglList, dari, sampai };
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
