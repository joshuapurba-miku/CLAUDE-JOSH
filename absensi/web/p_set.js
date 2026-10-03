
  // ---------- tab Tarif Gaji ----------
  function inpRow(p, i, f, val, type, extra) {
    const t = type || "number";
    const lebar = t === "text" && ["cabang", "posisi", "nama", "ket"].includes(f) ? ` class="wide${f === "cabang" ? " xl" : ""}" title="${esc(val == null ? "" : val)}"` : "";
    return `<td><input type="${t}"${lebar} data-p="${p}" data-i="${i}" data-f="${f}" value="${esc(val == null ? "" : val)}" ${t === "number" ? 'min="0" step="1000" inputmode="numeric" placeholder="0"' : ""} ${extra || ""} aria-label="${f}"></td>`;
  }
  function renderGaji() {
    const el = $("#tab-gaji");
    let h = `<div class="stack"><div class="panel"><h2>Tarif gaji per lokasi dan posisi</h2><p class="sub">Komponen tetap bulanan sesuai slip (bagian A. Penempatan). Satu baris untuk tiap kombinasi lokasi + posisi Kolabo. Pegawai yang berbeda dari tarif (misal PIC senior) diisi di Input Gaji, kolom "khusus".</p></div>`;
    h += dl("dl-cab", branchList()) + dl("dl-pos", postList());
    h += '<div class="scroll"><table><thead><tr><th>Lokasi</th><th>Posisi</th><th>Gaji pokok</th><th>Tunj. makan &amp; transport</th><th>Tunj. kinerja</th><th>Tunj. absensi</th><th>Admin &amp; payroll (potong)</th><th></th></tr></thead><tbody>';
    cfg.tarif.forEach((t, i) => {
      h += `<tr>${inpRow("tarif", i, "cabang", t.cabang, "text", 'list="dl-cab"')}${inpRow("tarif", i, "posisi", t.posisi, "text", 'list="dl-pos"')}${inpRow("tarif", i, "gaji", t.gaji || "")}${inpRow("tarif", i, "tunjMT", t.tunjMT || "")}${inpRow("tarif", i, "tunjKin", t.tunjKin || "")}${inpRow("tarif", i, "tunjAbs", t.tunjAbs || "")}${inpRow("tarif", i, "admin", t.admin)}<td><button class="btn ghost small" data-del="tarif" data-i="${i}">Hapus</button></td></tr>`;
    });
    h += `</tbody></table></div><div><button class="btn ghost" data-add="tarif">Tambah baris</button></div>
      <p class="hint">Lokasi tanpa jadwal tetap (${esc(list(cfg.tanpaJadwal).join(", ") || "tidak ada")}) boleh bergaji pokok 0; pendapatannya dari order home cleaning.</p></div>`;
    el.innerHTML = lockBanner() + h;
    bindEdits(el); kunciForm(el);
  }

  // ---------- tab Aturan ----------
  function renderAturan() {
    const el = $("#tab-aturan");
    const f = (label, key, extra) => `<div class="field"><label for="c-${key}">${label}</label><input type="number" id="c-${key}" data-cfg="${key}" value="${cfg[key]}" min="0" ${extra || ""}></div>`;
    const t = (label, key, ph) => `<div class="field"><label for="c-${key}">${label}</label><input type="text" id="c-${key}" data-cfg="${key}" value="${esc(cfg[key])}" placeholder="${esc(ph || "")}"></div>`;
    const chk = (k, l) => `<label class="row" style="gap:6px"><input type="checkbox" data-dasar="${k}"${cfg.dasarHarian[k] ? " checked" : ""}> ${l}</label>`;
    let h = '<div class="stack">';
    h += `<div class="panel stack"><div><h2>Identitas di slip gaji</h2><p class="sub">Nama perusahaan kosong = diambil dari file Kolabo.</p></div><div class="grid">
      ${t("Nama perusahaan", "perusahaan", perusahaanFile || "Nama perusahaan")}${t("Alamat / keterangan", "alamat", "")}${t("Judul slip", "judulSlip", "Financial Detail Report")}
      ${t("Kota tanda tangan", "kota", "Makassar")}${t("Nama penandatangan", "ttdNama", "")}${t("Jabatan penandatangan", "ttdJabatan", "")}</div>
      <div class="row" style="align-items:center">${logoSrc() ? `<img class="logo-prev" src="${logoSrc()}" alt="Logo saat ini">` : '<span class="sub">Belum ada logo.</span>'}
        <button class="btn ghost" id="logo-up">${logoSrc() ? "Ganti logo" : "Unggah logo"}</button>${logoSrc() ? '<button class="btn ghost" id="logo-del">Hapus logo</button>' : ""}<input type="file" id="logo-file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
        <span class="hint">PNG dengan latar transparan paling rapi. Logo muncul di aplikasi, slip, dan laporan.</span></div>
      <div class="field" style="max-width:520px"><label for="c-pw">Password PDF slip per pegawai</label><select id="c-pw" data-cfgsel="slipPassword">
        <option value="none"${cfg.slipPassword !== "nip" ? " selected" : ""}>Tanpa password</option><option value="nip"${cfg.slipPassword === "nip" ? " selected" : ""}>Password = NIP tanpa spasi (misal SQUAD021)</option></select>
        <span class="hint">Berlaku untuk PDF per pegawai dan isi ZIP. PDF gabungan untuk HR/keuangan tetap tanpa password.</span></div></div>`;
    h += `<div class="panel stack"><div><h2>Cara menghitung gaji</h2></div>
      <div class="field"><label for="c-metode">Metode untuk hari tidak masuk</label><select id="c-metode" data-cfgsel="metodeGaji">
        <option value="potong"${cfg.metodeGaji === "potong" ? " selected" : ""}>Gaji penuh, dipotong per hari tanpa keterangan / izin (seperti slip sekarang)</option>
        <option value="prorata"${cfg.metodeGaji === "prorata" ? " selected" : ""}>Prorata: komponen tetap × hari dibayar ÷ hari terjadwal</option></select>
        <span class="hint">Hari dibayar = hadir + sakit + cuti. Pegawai yang masuk/berhenti di tengah bulan selalu prorata (isi tanggalnya di Input Gaji).</span></div>
      <div class="field"><label>Dasar potongan per hari (metode potong) = jumlah komponen ini ÷ ${cfg.pembagi}</label><div class="row">${chk("gaji", "Gaji pokok")}${chk("tunjMT", "Tunj. makan & transport")}${chk("tunjKin", "Tunj. kinerja")}${chk("tunjAbs", "Tunj. absensi")}</div></div>
      <div class="grid">${f("Ambang telat (menit)", "telatAmbang")}${f("Potongan per kejadian telat (Rp)", "telatNominal", 'step="1000"')}${f("Pembagi hari kerja", "pembagi")}
      ${f("Tarif lembur bawaan (Rp / jam)", "tarifLembur", 'step="1000"')}${f("Potongan pulang cepat (Rp / menit)", "pulangPerMenit")}${f("Insentif mengganti / double shift (Rp)", "bonusDouble", 'step="1000"')}
      ${f("Toleransi telat (menit)", "tolTelat")}${f("Toleransi pulang cepat (menit)", "tolPulang")}${f("Lembur minimal (menit)", "lemburMin")}${f("Pembulatan lembur (menit)", "lemburBulat")}</div></div>`;
    h += `<div class="panel stack"><div><h2>Home cleaning (tanpa jadwal tetap)</h2><p class="sub">Lokasi di bawah ini bekerja sesuai order: hari tanpa check-in dianggap tidak ada order (bukan absen), tidak ada hitungan telat. Tiap check-in dihitung satu order; jam dibulatkan ke jam terdekat.</p></div>
      <div class="field"><label for="c-tanpaJadwal">Lokasi tanpa jadwal tetap (satu per baris)</label><textarea id="c-tanpaJadwal" data-cfg="tanpaJadwal">${esc(cfg.tanpaJadwal)}</textarea></div>
      <div class="scroll"><table><thead><tr><th>Jam order dari</th><th>sampai</th><th>Bagi hasil per jam</th><th>Makan per order</th><th>Transport per order</th><th></th></tr></thead><tbody>
      ${cfg.hcTarif.map((x, i) => `<tr>${inpRow("hcTarif", i, "min", x.min, "number", 'step="1"')}${inpRow("hcTarif", i, "max", x.max, "number", 'step="1"')}${inpRow("hcTarif", i, "bagi", x.bagi)}${inpRow("hcTarif", i, "makan", x.makan)}${inpRow("hcTarif", i, "trans", x.trans)}<td><button class="btn ghost small" data-del="hcTarif" data-i="${i}">Hapus</button></td></tr>`).join("")}
      </tbody></table></div><div><button class="btn ghost" data-add="hcTarif">Tambah baris</button></div>
      <p class="hint">Contoh dari slip Agustus: order 5 jam = 5 × Rp25.000 bagi hasil + Rp15.000 makan + Rp10.000 transport.</p></div>`;
    h += `<div class="panel stack"><div><h2>Aturan lembur per lokasi</h2><p class="sub">Lembur dari absensi dibayar otomatis jika lokasi dan tanggalnya cocok. Isi lokasi dengan * untuk semua lokasi. Tanggal selesai kosong = satu hari. Lembur per hari juga bisa disetujui satu-satu di Rekap Absensi.</p></div>${dl("dl-cab", branchList())}
      <div class="scroll"><table><thead><tr><th>Lokasi</th><th>Tanggal mulai</th><th>Tanggal selesai</th><th>Tarif / jam</th><th>NIP (opsional)</th><th>Keterangan</th><th></th></tr></thead><tbody>
      ${cfg.lembur.length ? "" : '<tr><td colspan="7" class="empty">Belum ada aturan lembur.</td></tr>'}
      ${cfg.lembur.map((a, i) => `<tr>${inpRow("lembur", i, "cabang", a.cabang, "text", 'list="dl-cab"')}${inpRow("lembur", i, "mulai", a.mulai, "date")}${inpRow("lembur", i, "selesai", a.selesai, "date")}${inpRow("lembur", i, "tarif", a.tarif || "")}${inpRow("lembur", i, "nip", a.nip, "text")}${inpRow("lembur", i, "ket", a.ket, "text")}<td><button class="btn ghost small" data-del="lembur" data-i="${i}">Hapus</button></td></tr>`).join("")}
      </tbody></table></div><div><button class="btn ghost" data-add="lembur">Tambah aturan lembur</button></div></div>`;
    h += `<details class="panel"><summary>Daftar shift dan penebakan shift</summary><div class="stack" style="margin-top:12px"><p class="sub">Jadwal di Kolabo sering tidak sama dengan shift yang dijalankan. Sistem memilih shift dari daftar ini yang paling cocok dengan jam check-in/out. Kolom lokasi dan hari boleh kosong (berlaku untuk semua), pisahkan dengan koma.</p>
      <div class="scroll"><table><thead><tr><th>Nama shift</th><th>Masuk</th><th>Pulang</th><th>Hanya lokasi</th><th>Hanya hari</th><th></th></tr></thead><tbody>
      ${cfg.shifts.map((s, i) => `<tr>${inpRow("shifts", i, "nama", s.nama, "text")}${inpRow("shifts", i, "masuk", s.masuk, "text", 'placeholder="06:00"')}${inpRow("shifts", i, "pulang", s.pulang, "text", 'placeholder="14:00"')}${inpRow("shifts", i, "cabang", s.cabang, "text")}${inpRow("shifts", i, "hari", s.hari, "text", 'placeholder="Sabtu"')}<td><button class="btn ghost small" data-del="shifts" data-i="${i}">Hapus</button></td></tr>`).join("")}
      </tbody></table></div><div><button class="btn ghost" data-add="shifts">Tambah shift</button></div>
      <div class="grid"><div class="field"><label for="c-alias">Jadwal Kolabo yang salah setting (jadwal = nama shift)</label><textarea id="c-alias" data-cfg="alias">${esc(cfg.alias)}</textarea></div>
      <div class="field"><label for="c-tetap">Lokasi dengan shift tetap (tidak ditebak), satu per baris</label><textarea id="c-tetap" data-cfg="tetap">${esc(cfg.tetap)}</textarea></div></div>
      <div class="grid">${f("Ganti shift jika lebih cocok (selisih menit)", "gantiShift")}${f("Tandai dicek jika selisih melebihi (menit)", "reviewBiaya")}${f("Durasi kerja minimal valid (menit)", "minKerja")}</div></div></details>`;
    h += aturanPersetujuanHTML();
    h += `<div class="panel stack"><div><h2>Bagikan pengaturan ke tim</h2><p class="sub">Simpan semua pengaturan (tarif, aturan, input gaji, koreksi absensi, invoice) ke satu file, lalu buka di laptop lain lewat tombol Impor.</p></div>
      <div class="row" data-free><button class="btn ghost" id="cfg-export">Ekspor pengaturan (.json)</button><button class="btn ghost" id="cfg-import">Impor pengaturan</button><input type="file" id="cfg-file" accept=".json,application/json" hidden><span class="hint" id="cfg-msg"></span></div></div>`;
    h += '<div><button class="btn ghost small" data-reset="1">Kembalikan semua pengaturan ke bawaan</button></div></div>';
    el.innerHTML = lockBanner() + h;
    bindEdits(el); kunciForm(el); bindAturanPersetujuan();
    $("#logo-up").onclick = () => $("#logo-file").click();
    if ($("#logo-del")) $("#logo-del").onclick = () => { cfg.logo = "none"; cfg.logoW = cfg.logoH = 0; scheduleSave(); applyBrand(); renderAturan(); };
    $("#logo-file").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, 480 / img.width, 200 / img.height), cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          cfg.logo = cv.toDataURL("image/png"); cfg.logoW = cv.width; cfg.logoH = cv.height;
          scheduleSave(); applyBrand(); renderAturan();
        };
        img.onerror = () => setSaved("File logo tidak bisa dibaca. Gunakan PNG atau JPG.");
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    $("#cfg-export").onclick = () => saveFile("pengaturan-rekap-gaji-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(cfg, null, 1), "application/json");
    $("#cfg-import").onclick = () => $("#cfg-file").click();
    $("#cfg-file").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (dikunci()) { $("#cfg-msg").textContent = "Buka kunci periode dulu sebelum mengimpor pengaturan."; return; }
      try { cfg = mergeCfg(JSON.parse(await file.text())); scheduleSave(); recompute(); renderAturan(); $("#cfg-msg").textContent = "Pengaturan diimpor dari " + file.name; }
      catch (err) { $("#cfg-msg").textContent = "File tidak bisa dibaca: pastikan file .json hasil ekspor halaman ini."; }
    };
  }

  // ---------- edit pengaturan ----------
  const NEW_ROW = {
    tarif: () => Object.assign({ cabang: "", posisi: "" }, TARIF_KOSONG),
    lembur: () => ({ cabang: "", mulai: "", selesai: "", tarif: 0, nip: "", ket: "" }),
    shifts: () => ({ nama: "", masuk: "", pulang: "", cabang: "", hari: "" }),
    hcTarif: () => ({ min: 0, max: 0, bagi: 0, makan: 0, trans: 0 })
  };
  function afterEdit(rerender) {
    scheduleSave(); recompute();
    if (rerender) { if (currentTab === "gaji") renderGaji(); if (currentTab === "aturan") renderAturan(); }
  }
  function bindEdits(root) {
    root.querySelectorAll("[data-p]").forEach((inp) => inp.addEventListener("change", () => {
      const row = cfg[inp.dataset.p][+inp.dataset.i];
      row[inp.dataset.f] = inp.type === "number" ? (+inp.value || 0) : inp.value;
      afterEdit(false);
    }));
    root.querySelectorAll("[data-cfg]").forEach((inp) => inp.addEventListener("change", () => { cfg[inp.dataset.cfg] = inp.type === "number" ? (+inp.value || 0) : inp.value; afterEdit(false); }));
    root.querySelectorAll("[data-cfgsel]").forEach((inp) => inp.addEventListener("change", () => { cfg[inp.dataset.cfgsel] = inp.value; afterEdit(false); }));
    root.querySelectorAll("[data-dasar]").forEach((inp) => inp.addEventListener("change", () => { cfg.dasarHarian[inp.dataset.dasar] = inp.checked; afterEdit(false); }));
    root.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => { cfg[b.dataset.add].push(NEW_ROW[b.dataset.add]()); afterEdit(true); }));
    root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { cfg[b.dataset.del].splice(+b.dataset.i, 1); afterEdit(true); }));
    root.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.armed) { cfg = defaultCfg(); afterEdit(true); } else { b.dataset.armed = "1"; b.textContent = "Klik lagi untuk menghapus semua pengaturan, input gaji, dan koreksi"; }
    }));
  }

  // ---------- simpan file ----------
  async function saveFile(filename, data, mime) {
    try {
      let dlc = null;
      if (window.claude && window.claude.use) { try { dlc = await window.claude.use("downloads"); } catch (e) { dlc = null; } }
      if (dlc) { await dlc.save({ filename, data }); return; }
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    } catch (e) {
      if (e && e.code === "declined") return;
      setSaved("Unduhan gagal: " + (e.message || e.code || e));
    }
  }
  const pwSlip = (r) => cfg.slipPassword === "nip" && r.NIP && r.NIP !== "0" ? r.NIP.replace(/\s+/g, "") : "";
  function buatPDF(list, pw) {
    if (!window.jspdf) throw new Error("Pembuat PDF belum termuat. Periksa koneksi lalu muat ulang halaman.");
    const o = { unit: "mm", format: "a4" };
    if (pw) o.encryption = { userPassword: pw, ownerPassword: pw + "-hr-" + hasil.periode, userPermissions: ["print"] };
    const doc = new window.jspdf.jsPDF(o);
    list.forEach((r, i) => { if (i) doc.addPage(); gambarSlip(doc, r); });
    return doc.output("arraybuffer");
  }
  async function unduhPDF(list, filename) {
    try { await saveFile(filename, buatPDF(list, list.length === 1 ? pwSlip(list[0]) : ""), "application/pdf"); } catch (e) { setSaved(e.message || String(e)); }
  }
  async function unduhZIP(list, filename) {
    try {
      if (!window.JSZip) throw new Error("Pembuat ZIP belum termuat. Periksa koneksi lalu muat ulang halaman.");
      setSaved("Menyiapkan " + list.length + " slip…");
      const zip = new window.JSZip();
      list.forEach((r) => zip.file(`${r.Cabang.replace(/[^\w]+/g, "_")}/Slip_${hasil.periode}_${r.Nama.replace(/[^\w]+/g, "_")}.pdf`, buatPDF([r], pwSlip(r))));
      await saveFile(filename, await zip.generateAsync({ type: "arraybuffer" }), "application/zip");
      setSaved("");
    } catch (e) { setSaved(e.message || String(e)); }
  }

  // ---------- Excel ----------
  async function unduhExcel() {
    try {
      const wb = XLSX.utils.book_new();
      const rekap = hasil.rekap.map((r) => ({
        Nama: r.Nama, NIP: r.NIP, Lokasi: r.Cabang, Posisi: r.Posisi, Jabatan: r.Jabatan, Status: r.StatusKerja, "Hari Terjadwal": r.Terjadwal, Hadir: r.Hadir, "Tanpa Keterangan": r.Absen,
        Izin: r.Izin, Sakit: r.Sakit, Cuti: r.Cuti, Off: r.Off, "Tidak Check In": r.TidakCI, "Tidak Check Out": r.TidakCO,
        "Telat (kali)": r.TelatKali, "Telat (mnt)": r.TelatMnt, "Telat Dipotong (kali)": r.TelatKenaKali, "Lembur Dibayar (jam)": r.LemburJam, "Order HC": r.Order, "Jam Order HC": r.OrderJam,
        "Shift Berubah": r.ShiftBerubah, "Dikoreksi Manual": r.Dikoreksi, "Telat Menurut Kolabo (mnt)": r.TelatHris
      }));
      const rinci = hasil.rekap.map((r) => {
        const o = { Nama: r.Nama, NIP: r.NIP, Lokasi: r.Cabang, Jabatan: r.Jabatan };
        r.slip.pend.forEach((s) => s.items.forEach((it) => { o[s.sec.slice(0, 2) + " " + it[0].replace(/ \(.*\)$/, "")] = it[1]; }));
        o["Pendapatan Bruto"] = r.slip.bruto;
        r.slip.pot.forEach((it) => { o["Pot. " + it[0].replace(/ \(.*\)$/, "")] = it[1]; });
        o["Total Potongan"] = r.slip.potongan;
        r.slip.ben.forEach((it) => { o["Benefit " + it[0]] = it[1]; });
        o["Gaji Diterima"] = r.GajiBersih == null ? "Tarif belum diisi" : Math.round(r.GajiBersih);
        o["Biaya Tenaga Kerja"] = r.adaTarif ? Math.round(r.Biaya) : "";
        return o;
      });
      const cab = perCabang().sort((a, b) => a.cabang.localeCompare(b.cabang)).map((c) => ({ Lokasi: c.cabang, Pegawai: c.n, "Kehadiran (%)": Math.round(c.persen * 1000) / 10, "Tanpa Keterangan": c.absen, "Telat (kali)": c.telat, "Gaji Ditransfer": Math.round(c.gaji), "Biaya Tenaga Kerja": Math.round(c.biaya), Invoice: c.invoice || "", Selisih: c.invoice ? Math.round(c.invoice - c.biaya) : "", "Margin (%)": c.invoice ? Math.round((c.invoice - c.biaya) / c.invoice * 1000) / 10 : "" }));
      const aoa = [];
      [...new Set(hasil.rekap.map((r) => r.Cabang))].sort().forEach((c) => {
        aoa.push([c]); aoa.push(["Pegawai", ...hasil.tanggal.map((t) => +t.slice(8)), "H", "T", "A", "I", "S", "C", "O"]);
        hasil.rekap.filter((r) => r.Cabang === c).sort((a, b) => a.Nama.localeCompare(b.Nama)).forEach((r) => {
          const m = new Map(r.detail.map((d) => [d.Tanggal, d.Kode]));
          aoa.push([r.Nama, ...hasil.tanggal.map((t) => m.get(t) || ""), r.Hadir - r.TelatKenaKali, r.TelatKenaKali, r.Absen, r.Izin, r.Sakit, r.Cuti, r.Off]);
        });
        aoa.push([]);
      });
      const det = hasil.det.map((d) => ({ Tanggal: d.Tanggal, Hari: d.Hari, Nama: d.Nama, NIP: d.NIP, Lokasi: d.Cabang, Kode: d.Kode, Status: STATUS_LABEL[d.Status], "Jadwal Kolabo": d["Jadwal HRIS"], "Shift Aktual": d["Shift Aktual"], "Check In": d["Check In"], "Check Out": d["Check Out"], "Telat (mnt)": d["Telat (mnt)"], "Potongan Telat": d["Potongan Telat (Rp)"], "Pulang Cepat (mnt)": d["Pulang Cepat (mnt)"], "Lewat Jam Pulang (mnt)": d["Lembur (mnt)"], "Lembur Dibayar (jam)": d["Lembur Dibayar (jam)"], "Upah Lembur": d["Upah Lembur (Rp)"], "Jam Kerja": d["Jam Kerja"], Koreksi: d.adj ? "ya" : "", Catatan: d.Catatan.concat(d._review).join("; ") }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cab), "Ringkasan Lokasi");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataTransfer()), "Daftar Transfer");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataLogKoreksi()), "Log Koreksi");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekap), "Rekap Absensi Pegawai");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Rekap per Lokasi");
      const jamSheet = (jenis) => {
        const days = hariBulan(), rows = [["Lokasi", "Pegawai", ...days.map((t) => +t.slice(8))]];
        [...hasil.rekap].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama)).forEach((r) => {
          const m = new Map(r.detail.map((d) => [d.Tanggal, d]));
          rows.push([r.Cabang, r.Nama, ...days.map((t) => {
            const d = m.get(t); if (!d) return "";
            if (d.Status !== "Present") return d.Status === "Off" ? "off" : d.Kode;
            if (jenis === "in") return (d["Check In"] || "").slice(0, 5) + (d["Telat (mnt)"] > 0 ? ` (telat ${d["Telat (mnt)"]})` : "");
            if (d.tidakCO || !d["Check Out"]) return "tidak CO";
            return d["Check Out"].slice(0, 5) + (d["Pulang Cepat (mnt)"] > 0 ? ` (cepat ${d["Pulang Cepat (mnt)"]})` : "");
          })]);
        });
        return XLSX.utils.aoa_to_sheet(rows);
      };
      XLSX.utils.book_append_sheet(wb, jamSheet("in"), "Jam Masuk");
      XLSX.utils.book_append_sheet(wb, jamSheet("out"), "Jam Pulang");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rinci), "Rincian Gaji");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), "Detail Harian");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil.review.length ? hasil.review.map((v) => { const o = Object.assign({}, v); delete o.key; return o; }) : [{ Info: "Tidak ada" }]), "Perlu Dicek");
      await saveFile("Rekap_Gaji_" + hasil.periode + ".xlsx", XLSX.write(wb, { type: "array", bookType: "xlsx" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) { setSaved("Unduhan gagal: " + (e.message || e)); }
  }

  // ---------- mulai ----------
  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.id = "file"; fileInput.accept = ".xlsx,.xls"; fileInput.hidden = true;
  document.body.appendChild(fileInput);
  fileInput.onchange = () => { if (fileInput.files[0]) muat(fileInput.files[0]); fileInput.value = ""; };
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  const tip = $("#tip");
  document.addEventListener("mousemove", (e) => {
    const t = e.target.closest && e.target.closest("[data-tip]");
    if (!t || !t.dataset.tip || $("#modal").innerHTML) { tip.hidden = true; return; }
    tip.textContent = t.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px"; tip.style.top = Math.min(e.clientY + 16, window.innerHeight - tip.offsetHeight - 8) + "px";
  });
  // init role
  activeRole = getRole();
  renderAll();
  loadCfg();
  if (!activeRole) rolePickerModal();
})();
</script>
