
  // ---------- tab Slip Gaji ----------
  let slipCabang = "", slipCari = "";
  function attItems(r) {
    return [["Hari kerja", r.Terjadwal], ["Hadir", r.Hadir], ["Off day", r.Off], ["Tanpa keterangan", r.Absen, r.Absen > 0], ["Izin", r.Izin],
      ["Sakit", r.Sakit], ["Tidak check-in", r.TidakCI], ["Tidak check-out", r.TidakCO, r.TidakCO > 0], ["Terlambat", r.TelatKenaKali + "×", r.TelatKenaKali > 0], ["Mengganti", r.Mengganti + "×"]];
  }
  function slipData(r) {
    const s = r.slip;
    const pend = s.pend.map((x, i) => Object.assign({}, x, { items: x.items.filter((it) => it[1] || (i === 0 && it[0] === "Gaji pokok")) })).filter((x, i) => i === 0 || x.total);
    const pot = s.pot.filter((x) => x[1]);
    const ben = s.ben.filter((x) => x[1]);
    return { pend, pot, ben };
  }
  function slipHTML(r) {
    const s = r.slip, d = slipData(r);
    const ln = (a, cls) => `<div class="ln${cls ? " " + cls : ""}"><span>${esc(a[0])}</span><span>${rp(a[1])}</span></div>`;
    const thp = s.ada ? Math.max(0, s.thp) : 0;
    return `<article class="slip" aria-label="Slip gaji ${esc(r.Nama)}">
      <div class="band"><div class="left">${logoSrc() ? `<span class="lg"><img src="${logoSrc()}" alt=""></span>` : ""}<div class="co">${esc(namaPT())}${cfg.alamat ? `<small>${esc(cfg.alamat)}</small>` : ""}</div></div>
        <div class="ttl">SLIP GAJI<small>${bulanLabel(hasil.periode)}</small><span class="no">No. ${esc(r.NoSlip)}</span>${terkunci() ? "" : '<span class="draft">DRAFT</span>'}</div></div>
      <div class="body">
        ${s.ada ? "" : '<div class="flag">Gaji pokok belum diisi untuk pegawai ini. Slip tidak ikut diunduh.</div>'}
        <div class="row between"><div class="muted">${esc(cfg.judulSlip)} · ${esc(POSISI_LABEL[r.Posisi] || r.Posisi)}</div><span class="conf">Rahasia · hanya untuk penerima</span></div>
        <dl class="id">
          <div><dt>Nama</dt><dd>${esc(r.Nama)}</dd></div><div><dt>NIP</dt><dd>${esc(r.NIP || "-")}</dd></div>
          <div><dt>Jabatan</dt><dd>${esc(r.Jabatan)}</dd></div><div><dt>Penempatan</dt><dd>${esc(r.Cabang)}</dd></div>
          <div><dt>Status</dt><dd>${esc(r.StatusKerja || "-")}</dd></div><div><dt>Performance</dt><dd>${esc(s.M.performance || "-")}</dd></div>
        </dl>
        <div class="att">${attItems(r).map((a) => `<div class="${a[2] ? "bad" : ""}"><b>${a[1]}</b><span>${a[0]}</span></div>`).join("")}</div>
        ${barisBackup(r).map((t) => `<div class="muted">${esc(t)}</div>`).join("")}
        <div class="cols">
          <div><h4>Pendapatan</h4>${d.pend.map((x) => `<div class="sec">${esc(x.sec)}${x.info ? ` <small>(${esc(x.info)})</small>` : ""}</div>${x.items.map((it) => ln(it)).join("")}${x.items.length > 1 ? ln(["Subtotal", x.total], "sub") : ""}`).join("")}
            ${ln(["Total pendapatan bruto", s.bruto], "tot")}</div>
          <div><h4>Potongan</h4>${d.pot.length ? d.pot.map((x) => ln(x)).join("") : '<div class="ln"><span>Tidak ada potongan</span><span>Rp0</span></div>'}${ln(["Total potongan", s.potongan], "tot")}
            ${d.ben.length ? `<h4 style="margin-top:14px">Benefit dari perusahaan</h4>${d.ben.map((x) => ln(x)).join("")}${ln(["Total benefit", s.benefit], "tot")}<div class="muted" style="margin-top:4px">Dibayarkan perusahaan ke BPJS/penyedia, tidak diterima tunai.</div>` : ""}</div>
        </div>
        <div class="net"><div><span>Total pendapatan</span><b>${rp(s.bruto)}</b></div><div><span>Total potongan</span><b>−${rp(s.potongan)}</b></div><div class="thp"><span>Gaji diterima (take home pay)</span><b>${s.ada ? rp(thp) : "—"}</b></div></div>
        ${s.ada ? `<div class="terb">Terbilang: ${terbilang(thp)}</div>` : ""}
        ${s.M.catatan ? `<div><b>Catatan:</b> ${esc(s.M.catatan)}</div>` : ""}
        <div class="sign"><div>Penerima<div class="sp"></div><b>${esc(r.Nama)}</b></div>${ttdBlokHTML(r)}</div>
        ${s.ada ? `<div class="acts"><button class="btn ghost small" data-pdf="${esc(r.key)}">Unduh PDF</button></div>` : ""}
      </div></article>`;
  }
  function renderSlip() {
    const el = $("#tab-slip");
    if (!hasil) { el.innerHTML = kosong("Slip gaji dibuat dari data absensi. Upload export dulu."); bindUpload(el); return; }
    const list = hasil.rekap.filter((r) => (!slipCabang || r.Cabang === slipCabang) && (!slipCari || (r.Nama + " " + r.NIP).toLowerCase().includes(slipCari.toLowerCase())));
    const siap = list.filter((r) => r.adaTarif && r.Pendapatan > 0), nol = list.filter((r) => r.adaTarif && !r.Pendapatan).length, belum = list.length - siap.length - nol;
    let h = `<div class="stack"><div class="panel"><div class="row between"><div><h2>Slip gaji ${bulanLabel(hasil.periode)}</h2><p class="sub">${siap.length} slip siap${belum ? `, ${belum} menunggu gaji pokok` : ""}${nol ? `, ${nol} tanpa pendapatan bulan ini (tidak diunduh)` : ""}. Unduh semua slip yang tampil: satu PDF (satu halaman per pegawai) atau ZIP berisi PDF terpisah per pegawai, dikelompokkan per lokasi.</p></div>
      <div class="row"><button class="btn ghost" id="zipAll" ${siap.length ? "" : "disabled"}>ZIP: 1 file per pegawai</button><button class="btn" id="pdfAll" ${siap.length ? "" : "disabled"}>Unduh ${siap.length} slip (1 PDF)</button></div></div>
      <div class="filters" style="margin-top:12px"><div class="row"><select id="scab" aria-label="Filter lokasi">${cabangOpts(slipCabang, true)}</select>
      <input type="text" id="scari" placeholder="Cari nama / NIP" value="${esc(slipCari)}" aria-label="Cari slip"></div><span class="hint">Komponen variabel (home cleaning, bonus, kasbon, dll) diisi di tab Input Gaji.</span></div></div>`;
    h += panelPersetujuan(siap.length);
    if (belum) h += `<div class="banner warn">${belum} pegawai belum punya gaji pokok. <a href="#" data-go="gaji">Isi Tarif Gaji</a> atau isi gaji pokok khusus di Input Gaji.</div>`;
    h += list.length ? `<div class="slips">${list.map(slipHTML).join("")}</div>` : '<p class="empty">Tidak ada pegawai yang cocok.</p>';
    el.innerHTML = h + "</div>";
    bindUpload(el);
    $("#scab").onchange = (e) => { slipCabang = e.target.value; renderSlip(); };
    const cari = $("#scari");
    cari.oninput = (e) => { slipCari = e.target.value; clearTimeout(cari._t); cari._t = setTimeout(() => { renderSlip(); const n = $("#scari"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    const nmFile = "Slip_Gaji_" + hasil.periode + (slipCabang ? "_" + slipCabang.replace(/[^\w]+/g, "_") : "");
    bindPersetujuan();
    $("#pdfAll").onclick = () => unduhPDF(siap, nmFile + ".pdf");
    $("#zipAll").onclick = () => unduhZIP(siap, nmFile + ".zip");
    el.querySelectorAll("[data-pdf]").forEach((b) => b.onclick = () => {
      const r = hasil.rekap.find((x) => x.key === b.dataset.pdf);
      unduhPDF([r], "Slip_Gaji_" + hasil.periode + "_" + r.Nama.replace(/[^\w]+/g, "_") + ".pdf");
    });
  }

  // ---------- PDF slip (A4) ----------
  function gambarSlip(doc, r) {
    const G = [14, 92, 61], INK = [27, 36, 48], MUTED = [93, 104, 116], SOFT = [238, 244, 241], LINE = [221, 227, 232], RED = [179, 38, 30];
    const s = r.slip, d = slipData(r), thp = Math.max(0, s.thp);
    const rpT = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
    const X0 = 14, X1 = 196, W = X1 - X0;
    // kepala
    if (!terkunci()) watermark(doc, "DRAFT");
    doc.setFillColor(...G); doc.rect(0, 0, 210, 30, "F");
    const tx = X0 + logoPDF(doc, X0, 4, 22);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    namaPDF(doc, tx, 13, 118 - (tx - X0));
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(cfg.alamat || "", 118 - (tx - X0))[0] || "", tx, 19);
    doc.text(cfg.judulSlip + " · " + (POSISI_LABEL[r.Posisi] || r.Posisi), tx, 24);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("SLIP GAJI", X1, 12, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.text("Periode " + bulanLabel(hasil.periode), X1, 18, { align: "right" });
    doc.text("No. " + r.NoSlip, X1, 23, { align: "right" });
    doc.setFontSize(7.5); doc.text(terkunci() ? "RAHASIA" : "DRAFT · RAHASIA", X1, 27.5, { align: "right" });
    let y = 40;
    // identitas
    const idf = [["Nama", r.Nama, "NIP", r.NIP || "-"], ["Jabatan", r.Jabatan, "Penempatan", r.Cabang], ["Status", r.StatusKerja || "-", "Performance", s.M.performance || "-"]];
    doc.setFontSize(9.5);
    idf.forEach((p) => {
      doc.setTextColor(...MUTED); doc.text(p[0], X0, y); doc.text(p[2], 107, y);
      doc.setTextColor(...INK); doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(String(p[1]), 62)[0], X0 + 24, y); doc.text(doc.splitTextToSize(String(p[3]), 62)[0], 107 + 24, y);
      doc.setFont("helvetica", "normal"); y += 6;
    });
    // kehadiran
    y += 1;
    const att = attItems(r), cw = W / 5;
    att.forEach((a, i) => {
      const cx = X0 + (i % 5) * cw, cy = y + Math.floor(i / 5) * 13;
      doc.setFillColor(...SOFT); doc.rect(cx + 0.4, cy, cw - 0.8, 12, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...(a[2] ? RED : INK)); doc.text(String(a[1]), cx + 3, cy + 5.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(a[0], cx + 3, cy + 10);
    });
    y += 33;
    barisBackup(r).forEach((t) => { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); const ln = doc.splitTextToSize(t, W); doc.text(ln, X0, y - 3); y += ln.length * 4; });
    // dua kolom
    const CW = 86, XL = X0, XR = X0 + W - CW;
    const head = (t, x, yy) => { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...G); doc.text(t.toUpperCase(), x, yy); doc.setDrawColor(...G); doc.setLineWidth(0.4); doc.line(x, yy + 1.5, x + CW, yy + 1.5); return yy + 7; };
    const line = (a, x, yy, bold) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
      doc.text(doc.splitTextToSize(a[0], CW - 28)[0], x, yy); doc.text(rpT(a[1]), x + CW, yy, { align: "right" }); return yy + 5;
    };
    const total = (a, x, yy) => { doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(x, yy - 3.4, x + CW, yy - 3.4); return line(a, x, yy + 0.6, true) + 1; };
    let yl = head("Pendapatan", XL, y);
    d.pend.forEach((sec) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      doc.text(sec.sec + (sec.info ? "  (" + sec.info + ")" : ""), XL, yl); yl += 4.6;
      sec.items.forEach((it) => { yl = line(it, XL + 2, yl); });
      if (sec.items.length > 1) { doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(XL + 2, yl - 3.4, XL + CW, yl - 3.4); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text("Subtotal", XL + 2, yl); doc.text(rpT(sec.total), XL + CW, yl, { align: "right" }); yl += 5; }
      yl += 1.5;
    });
    yl = total(["Total pendapatan bruto", s.bruto], XL, yl + 1);
    let yr = head("Potongan", XR, y);
    (d.pot.length ? d.pot : [["Tidak ada potongan", 0]]).forEach((x) => { yr = line(x, XR, yr); });
    yr = total(["Total potongan", s.potongan], XR, yr + 1);
    if (d.ben.length) {
      yr = head("Benefit dari perusahaan", XR, yr + 5);
      d.ben.forEach((x) => { yr = line(x, XR, yr); });
      yr = total(["Total benefit", s.benefit], XR, yr + 1);
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
      doc.text("Dibayarkan perusahaan ke BPJS/penyedia, tidak diterima tunai.", XR, yr); yr += 4;
    }
    y = Math.max(yl, yr) + 5;
    // ringkasan
    doc.setFillColor(...SOFT); doc.rect(X0, y, W, 20, "F");
    const sx = [X0 + 4, X0 + 64, X0 + 120];
    [["Total pendapatan", rpT(s.bruto)], ["Total potongan", "-" + rpT(s.potongan)], ["Gaji diterima (take home pay)", rpT(thp)]].forEach((a, i) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(a[0], sx[i], y + 7);
      doc.setFont("helvetica", "bold"); doc.setFontSize(i === 2 ? 15 : 11); doc.setTextColor(...(i === 2 ? G : INK)); doc.text(a[1], sx[i], y + 15);
    });
    y += 26;
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    const tb = doc.splitTextToSize("Terbilang: " + terbilang(thp), W); doc.text(tb, X0, y); y += tb.length * 4.5 + 2;
    if (s.M.catatan) { doc.setFont("helvetica", "normal"); doc.setTextColor(...INK); const c = doc.splitTextToSize("Catatan: " + s.M.catatan, W); doc.text(c, X0, y); y += c.length * 4.5 + 2; }
    // tanda tangan
    y = Math.max(y + 6, 240);
    if (y > 244) { doc.addPage(); y = 30; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
    doc.text("Penerima", 50, y, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.text(r.Nama, 50, y + 28, { align: "center" });
    ttdPDF(doc, 160, y, r);
    doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    const ap = cfg.approval[hasil.periode];
    doc.text(`Dihitung dari data absensi Kolabo ${hasil.dari} s/d ${hasil.sampai}. ${ap ? "Disetujui oleh " + ap.oleh + ", " + ap.tanggal + "." : "DRAFT, belum disetujui."} Dokumen rahasia, hanya untuk penerima.`, X0, 290);
  }

  // ---------- util PDF bersama ----------
  function logoPDF(doc, x, y, h) {
    if (!logoSrc() || !cfg.logoW) return 0;
    const ih = h - 3, w = Math.min(45, ih * cfg.logoW / cfg.logoH), ihh = w * cfg.logoH / cfg.logoW;
    doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, w + 4, h, 2, 2, "F");
    try { doc.addImage(logoSrc(), "PNG", x + 2, y + (h - ihh) / 2, w, ihh); } catch (e) { return 0; }
    return w + 8;
  }
  function watermark(doc, teks) {
    doc.saveGraphicsState();
    try { doc.setGState(new doc.GState({ opacity: 0.07 })); } catch (e) { /* abaikan */ }
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "bold"); doc.setFontSize(110);
    doc.text(teks, 45, 215, { angle: 35 });
    doc.restoreGraphicsState();
  }
  function namaPDF(doc, x, y, maxW) {
    doc.setFontSize(14);
    if (doc.getTextWidth(namaPT()) <= maxW) { doc.text(namaPT(), x, y); return; }
    doc.setFontSize(11);
    const ln = doc.splitTextToSize(namaPT(), maxW).slice(0, 2);
    doc.text(ln, x, ln.length > 1 ? y - 3.6 : y);
  }

  // ---------- blok tanda tangan approver ----------
  function ttdBlokHTML(r) {
    const ap = cfg.approval[hasil.periode], tt = ttdValid();
    if (tt) return `<div>${esc(cfg.kota)}, ${esc(ap.tanggal)}<div class="sp ttd"><img src="${tt}" alt="Tanda tangan ${esc(ap.oleh)}"></div><b>${esc(ap.oleh)}</b><div>${esc(ap.jabatan || cfg.ttdJabatan)}</div>
      <div class="vcode">Ditandatangani digital · kunci ${esc(ap.kode)}<br>Kode verifikasi slip ${esc(kodeSlip(r))}</div></div>`;
    return `<div>${esc(cfg.kota)}, ${ap ? esc(ap.tanggal) : "................"}<div class="sp"></div><b>${esc(ap ? ap.oleh : cfg.ttdNama || "(........................)")}</b><div>${esc(cfg.ttdJabatan)}</div>${ap ? "" : '<div class="vcode">Belum disetujui</div>'}</div>`;
  }
  function ttdPDF(doc, cx, y, r) {
    const ap = cfg.approval[hasil.periode], tt = ttdValid();
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(27, 36, 48);
    doc.text(cfg.kota + ", " + (ap ? ap.tanggal : "................"), cx, y, { align: "center" });
    if (tt) {
      try { const pr = doc.getImageProperties(tt), h = 21, w = Math.min(55, h * pr.width / pr.height); doc.addImage(tt, "PNG", cx - w / 2, y + 2.5, w, w * pr.height / pr.width); } catch (e) { /* abaikan */ }
    }
    doc.setFont("helvetica", "bold"); doc.text(ap ? ap.oleh : (cfg.ttdNama || "(........................)"), cx, y + 28, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text((ap && ap.jabatan) || cfg.ttdJabatan || "", cx, y + 33, { align: "center" });
    doc.setFontSize(7); doc.setTextColor(93, 104, 116);
    if (tt) { doc.text("Ditandatangani digital · kunci " + ap.kode, cx, y + 37.5, { align: "center" }); if (r) doc.text("Kode verifikasi slip " + kodeSlip(r), cx, y + 41, { align: "center" }); }
    else if (!ap) doc.text("Belum disetujui", cx, y + 37.5, { align: "center" });
  }

  function barisBackup(r) {
    const out = [];
    if (r.BackupList && r.BackupList.length) out.push("Backup: " + r.BackupList.map((o) => `${tglPendek(o.tgl)} menggantikan ${o.namaDiganti}${o.cabang ? " (" + o.cabang + ")" : ""}`).join(", "));
    if (r.DibackupList && r.DibackupList.length) out.push("Dibackup: " + r.DibackupList.map((o) => `${tglPendek(o.tgl)} oleh ${o.oleh}`).join(", "));
    return out;
  }
