  function perCabang() {
    const m = new Map();
    hasil.rekap.forEach((r) => {
      if (!m.has(r.Cabang)) m.set(r.Cabang, { cabang: r.Cabang, n: 0, hadir: 0, terjadwal: 0, absen: 0, telat: 0, telatPot: 0, lembur: 0, lemburTak: 0, gaji: 0, tarifKurang: 0, berubah: 0 });
      const c = m.get(r.Cabang);
      c.n++; c.hadir += r.Hadir; c.terjadwal += r.Terjadwal; c.absen += r.Absen; c.telat += r.TelatKali; c.telatPot += r.TelatPot;
      c.lembur += r.LemburUpah; c.lemburTak += r.LemburTakDibayarJam; c.gaji += r.GajiBersih || 0; c.berubah += r.ShiftBerubah;
      if (!r.adaTarif && r.Hadir > 0) c.tarifKurang++;
    });
    return [...m.values()].map((c) => Object.assign(c, { persen: c.terjadwal ? c.hadir / c.terjadwal : 0 }));
  }
  function perHari() {
    const m = new Map();
    hasil.det.forEach((d) => {
      if (!m.has(d.Tanggal)) m.set(d.Tanggal, { tgl: d.Tanggal, hari: d.Hari, hadir: 0, terjadwal: 0 });
      const x = m.get(d.Tanggal);
      if (d.Status === "Present") { x.hadir++; x.terjadwal++; } else if (d.Status === "Absent") x.terjadwal++;
    });
    return [...m.values()].sort((a, b) => a.tgl.localeCompare(b.tgl)).map((x) => Object.assign(x, { persen: x.terjadwal ? x.hadir / x.terjadwal : 0 }));
  }

  function insights(cab) {
    const out = [], rk = hasil.rekap;
    const nol = rk.filter((r) => r.Terjadwal && r.Hadir === 0);
    if (nol.length) {
      const g = sumBy(nol, (r) => r.gaji);
      out.push({ sev: "bad", what: `${nol.length} karyawan tidak pernah hadir sebulan penuh`,
        act: `${nol.map((r) => r.Nama).join(", ")}. Pastikan statusnya (resign, belum pakai aplikasi, atau cuti panjang). Jika sudah tidak aktif, nonaktifkan di HRIS.` + (g ? ` Gaji pokok mereka yang masih tercatat ${rp(g)} per bulan.` : "") });
    }
    const rendah = cab.filter((c) => c.terjadwal && c.persen < AMBANG_HADIR).sort((a, b) => a.persen - b.persen);
    if (rendah.length) out.push({ sev: rendah[0].persen < 0.7 ? "bad" : "warn", what: `Kehadiran di bawah ${Math.round(AMBANG_HADIR * 100)}% di ${rendah.length} cabang`,
      act: rendah.map((c) => `${c.cabang} (${pct(c.persen)}, ${c.absen} hari absen)`).join("; ") + ". Cek kecukupan personel dan apakah jadwal di HRIS sesuai kenyataan." });
    const kena = rk.filter((r) => r.TelatKenaKali > 0).sort((a, b) => b.TelatKenaKali - a.TelatKenaKali || b.TelatMnt - a.TelatMnt);
    if (kena.length) out.push({ sev: "warn", what: `Telat lebih dari ${cfg.telatAmbang} menit terjadi ${sumBy(kena, (r) => r.TelatKenaKali)} kali, potongan ${rp(sumBy(kena, (r) => r.TelatPot))}`,
      act: "Paling sering: " + kena.slice(0, 3).map((r) => `${r.Nama} (${r.TelatKenaKali}×, ${r.TelatMnt} mnt)`).join(", ") + ". Pertimbangkan teguran atau evaluasi jam shift mereka." });
    const hadir = sumBy(rk, (r) => r.Hadir), berubah = sumBy(rk, (r) => r.ShiftBerubah);
    if (hadir && berubah / hadir > 0.1) {
      const top = [...cab].sort((a, b) => b.berubah - a.berubah).slice(0, 3).filter((c) => c.berubah);
      out.push({ sev: "warn", what: `${pct(berubah / hadir)} hari kerja dijalankan di shift yang berbeda dari jadwal HRIS`,
        act: "Paling banyak di " + top.map((c) => `${c.cabang} (${c.berubah} hari)`).join(", ") + ". Perbarui jadwal di HRIS agar angka telat dari HRIS bisa dipercaya. Sistem ini sudah menyesuaikan otomatis." });
    }
    const tak = sumBy(rk, (r) => r.LemburTakDibayarJam);
    if (tak >= 1) {
      const top = [...cab].sort((a, b) => b.lemburTak - a.lemburTak).slice(0, 3).filter((c) => c.lemburTak >= 0.5);
      out.push({ sev: "info", what: `${jam(tak)} lembur terdeteksi, belum dibayar karena belum ada aturan lembur`,
        act: "Terbanyak di " + top.map((c) => `${c.cabang} (${jam(c.lemburTak)})`).join(", ") + ". Jika memang lembur yang disetujui, tambahkan aturan per cabang dan tanggal di tab Aturan." });
    }
    const tk = rk.filter((r) => !r.adaTarif && r.Hadir > 0);
    if (tk.length) out.push({ sev: "warn", what: `${tk.length} karyawan belum punya tarif gaji, slip dan total biaya belum lengkap`,
      act: "Isi di tab Tarif Gaji: " + [...new Set(tk.map((r) => r.Cabang + " / " + r.Posisi))].join("; ") + "." });
    const totGaji = sumBy(cab, (c) => c.gaji);
    if (totGaji) {
      const b = [...cab].sort((a, b) => b.gaji - a.gaji)[0];
      out.push({ sev: "info", what: `Biaya gaji terbesar: ${b.cabang}, ${rp(b.gaji)} (${pct(b.gaji / totGaji)} dari total)`, act: `Rata-rata ${rp(b.gaji / Math.max(1, b.n))} per karyawan (${b.n} orang).` });
    }
    const dq = hasil.review.filter((v) => v.Alasan.startsWith("NIP"));
    if (dq.length) out.push({ sev: "info", what: `${dq.length} masalah data NIP di HRIS`, act: dq.map((v) => `${v.Nama}: ${v.Alasan}`).join("; ") + "." });
    if (!out.length) out.push({ sev: "ok", what: "Tidak ada masalah besar bulan ini", act: "Kehadiran, keterlambatan, dan lembur dalam batas wajar." });
    return out;
  }

  // ---------- grafik ----------
  function hbars(items, fmt, opts) {
    const max = Math.max(...items.map((x) => x.v), opts && opts.max || 0) || 1;
    return '<div class="hbars">' + items.map((x) =>
      `<div class="hbar" data-tip="${esc(x.tip || "")}"><div class="nm">${esc(x.label)}</div><div class="tr"><div class="fl ${x.warn ? "warn" : ""}" style="width:${Math.max(0.5, x.v / max * 100)}%"></div></div><div class="vl">${fmt(x.v)}</div></div>`).join("") + "</div>";
  }
  function kolomHarian(hr) {
    const W = 760, H = 210, L = 38, R = 8, T = 10, B = 26, n = hr.length;
    const cw = (W - L - R) / n, bw = Math.max(3, cw - 3);
    const y = (p) => T + (1 - p) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Persentase kehadiran per hari"><g class="grid">`;
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => { s += `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}"></line><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`; });
    s += "</g>";
    hr.forEach((d, i) => {
      const x = L + i * cw + (cw - bw) / 2, top = y(d.persen), hgt = Math.max(0, y(0) - top);
      const tip = `${d.hari} ${d.tgl.slice(8)}/${d.tgl.slice(5, 7)}: ${d.hadir} hadir dari ${d.terjadwal} terjadwal (${pct(d.persen)})`;
      s += `<g class="c" data-tip="${esc(tip)}"><rect class="hit" x="${L + i * cw}" y="${T}" width="${cw}" height="${H - T - B}"></rect><rect class="col ${d.persen < AMBANG_HADIR ? "warn" : ""}" x="${x}" y="${top}" width="${bw}" height="${hgt}" rx="${Math.min(3, bw / 2)}"></rect></g>`;
      if (i === 0 || (+d.tgl.slice(8)) % 5 === 0) s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${+d.tgl.slice(8)}</text>`;
    });
    return s + "</svg>";
  }
  const legenda = () => `<div class="legend"><span><i style="background:var(--bar)"></i>${Math.round(AMBANG_HADIR * 100)}% atau lebih</span><span><i style="background:var(--warn-bar)"></i>di bawah ${Math.round(AMBANG_HADIR * 100)}% (perlu perhatian)</span></div>`;

  // ---------- tab Dashboard ----------
  function renderDash() {
    const el = $("#tab-dash");
    if (!hasil) { el.innerHTML = uploadPanel(); bindUpload(el); return; }
    const rk = hasil.rekap, cab = perCabang().sort((a, b) => a.persen - b.persen), hr = perHari();
    const hadir = sumBy(rk, (r) => r.Hadir), terj = sumBy(rk, (r) => r.Terjadwal), adaTarif = rk.filter((r) => r.adaTarif).length;
    const totGaji = sumBy(rk, (r) => r.GajiBersih || 0);
    const sev = { bad: ["bad", "Kritis"], warn: ["warn", "Perhatian"], info: ["", "Info"], ok: ["ok", "Baik"] };
    let h = '<div class="stack">';
    h += `<div class="kpis">
      <div class="kpi"><div class="l">Total gaji dibayar</div><div class="v">${adaTarif ? rp(totGaji) : "—"}</div><div class="s">${adaTarif} dari ${rk.length} karyawan sudah ada tarif</div></div>
      <div class="kpi"><div class="l">Tingkat kehadiran</div><div class="v">${pct(terj ? hadir / terj : 0)}</div><div class="s">${num(hadir)} hadir · ${num(terj - hadir)} absen</div></div>
      <div class="kpi"><div class="l">Telat &gt; ${cfg.telatAmbang} menit</div><div class="v">${num(sumBy(rk, (r) => r.TelatKenaKali))}×</div><div class="s">potongan ${rp(sumBy(rk, (r) => r.TelatPot))}</div></div>
      <div class="kpi"><div class="l">Lembur dibayar</div><div class="v">${rp(sumBy(rk, (r) => r.LemburUpah))}</div><div class="s">${jam(sumBy(rk, (r) => r.LemburJam))} · ${jam(sumBy(rk, (r) => r.LemburTakDibayarJam))} belum diputuskan</div></div>
      <div class="kpi"><div class="l">Perlu dicek manual</div><div class="v">${hasil.review.length}</div><div class="s">kasus, lihat tab Karyawan</div></div>
    </div>`;
    h += '<div class="panel"><h2>Yang perlu diputuskan bulan ini</h2><p class="sub">Disusun otomatis dari data, urut dari yang paling penting.</p><div class="insights" style="margin-top:6px">' +
      insights(cab).map((x) => `<div class="ins"><div><span class="pill ${sev[x.sev][0]}">${sev[x.sev][1]}</span></div><div><div class="what">${esc(x.what)}</div><div class="act">${esc(x.act)}</div></div></div>`).join("") + "</div></div>";
    h += '<div class="cols2">';
    h += '<div class="panel"><h2>Kehadiran per cabang</h2><p class="sub">Hari hadir dibanding hari terjadwal. Terendah di atas.</p>' +
      hbars(cab.map((c) => ({ label: c.cabang, v: c.persen, warn: c.persen < AMBANG_HADIR, tip: `${c.cabang}: ${c.hadir} hadir dari ${c.terjadwal} hari terjadwal, ${c.n} karyawan` })), pct, { max: 1 }) + legenda() + "</div>";
    if (totGaji) {
      const byG = [...cab].sort((a, b) => b.gaji - a.gaji);
      h += '<div class="panel"><h2>Biaya gaji per cabang</h2><p class="sub">Gaji bersih yang dibayar (karyawan dengan tarif terisi).</p>' +
        hbars(byG.map((c) => ({ label: c.cabang, v: c.gaji, tip: `${c.cabang}: ${rp(c.gaji)} untuk ${c.n} karyawan` + (c.tarifKurang ? `, ${c.tarifKurang} belum ada tarif` : "") })), rp) + "</div>";
    } else {
      h += '<div class="panel"><h2>Biaya gaji per cabang</h2><p class="sub" style="margin-top:8px">Muncul setelah tarif gaji diisi.</p><p style="margin-top:12px"><button class="btn ghost" data-go="gaji">Isi Tarif Gaji</button></p></div>';
    }
    h += "</div>";
    h += `<div class="panel chart"><div class="row between"><div><h2>Kehadiran harian</h2><p class="sub">Persentase karyawan terjadwal yang hadir tiap tanggal. Arahkan kursor ke batang untuk detail.</p></div></div>${kolomHarian(hr)}${legenda()}
      <details style="margin-top:10px"><summary class="hint">Lihat sebagai tabel</summary><div class="scroll" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Hari</th><th class="n">Hadir</th><th class="n">Terjadwal</th><th class="n">Kehadiran</th></tr></thead><tbody>${hr.map((d) => `<tr><td>${d.tgl}</td><td>${esc(d.hari)}</td><td class="n">${d.hadir}</td><td class="n">${d.terjadwal}</td><td class="n">${pct(d.persen)}</td></tr>`).join("")}</tbody></table></div></details></div>`;
    const telat = [...rk].filter((r) => r.TelatMnt > 0).sort((a, b) => b.TelatMnt - a.TelatMnt).slice(0, 8);
    const absen = [...rk].filter((r) => r.Absen > 0).sort((a, b) => b.Absen - a.Absen).slice(0, 8);
    h += '<div class="cols2">';
    h += '<div class="panel"><h2>Paling banyak telat</h2><p class="sub">Total menit telat dalam sebulan, dihitung dari shift yang benar-benar dijalankan.</p>' +
      (telat.length ? hbars(telat.map((r) => ({ label: r.Nama, v: r.TelatMnt, tip: `${r.Nama} (${r.Cabang}): ${r.TelatKali}× telat, ${r.TelatKenaKali}× kena potongan ${rp(r.TelatPot)}` })), (v) => num(v) + " mnt") : '<p class="empty">Tidak ada yang telat.</p>') + "</div>";
    h += '<div class="panel"><h2>Paling banyak absen</h2><p class="sub">Hari terjadwal tanpa check-in (belum termasuk izin yang dicatat).</p>' +
      (absen.length ? hbars(absen.map((r) => ({ label: r.Nama, v: r.Absen, warn: r.Hadir === 0, tip: `${r.Nama} (${r.Cabang}): ${r.Absen} absen dari ${r.Terjadwal} hari terjadwal` + (r.Izin ? `, ${r.Izin} izin` : "") })), (v) => v + " hari") +
        '<div class="legend"><span><i style="background:var(--warn-bar)"></i>tidak pernah hadir sebulan</span></div>' : '<p class="empty">Tidak ada yang absen.</p>') + "</div>";
    h += "</div>";
    const cabNama = [...cab].sort((a, b) => a.cabang.localeCompare(b.cabang));
    h += '<div class="stack" style="gap:8px"><h2>Ringkasan per cabang</h2><div class="scroll"><table><thead><tr><th>Cabang</th><th class="n">Karyawan</th><th class="n">Kehadiran</th><th class="n">Absen</th><th class="n">Telat</th><th class="n">Pot. telat</th><th class="n">Lembur</th><th class="n">Lembur belum diputuskan</th><th class="n">Total gaji</th></tr></thead><tbody>' +
      cabNama.map((c) => `<tr><td>${esc(c.cabang)}</td><td class="n">${c.n}</td><td class="n">${c.persen < AMBANG_HADIR ? '<span class="pill warn">' + pct(c.persen) + "</span>" : pct(c.persen)}</td><td class="n">${c.absen}</td><td class="n">${c.telat}×</td><td class="n">${rp(c.telatPot)}</td><td class="n">${rp(c.lembur)}</td><td class="n">${c.lemburTak >= 0.1 ? jam(c.lemburTak) : "—"}</td><td class="n">${c.gaji ? rp(c.gaji) : "—"}${c.tarifKurang ? ' <span class="pill warn">' + c.tarifKurang + " tanpa tarif</span>" : ""}</td></tr>`).join("") +
      `<tr class="tot"><td>Total</td><td class="n">${rk.length}</td><td class="n">${pct(terj ? hadir / terj : 0)}</td><td class="n">${num(terj - hadir)}</td><td class="n">${num(sumBy(rk, (r) => r.TelatKali))}×</td><td class="n">${rp(sumBy(rk, (r) => r.TelatPot))}</td><td class="n">${rp(sumBy(rk, (r) => r.LemburUpah))}</td><td class="n">${jam(sumBy(rk, (r) => r.LemburTakDibayarJam))}</td><td class="n">${rp(totGaji)}</td></tr></tbody></table></div></div>`;
    h += "</div>";
    el.innerHTML = h;
    bindUpload(el);
  }

  // ---------- tab Karyawan ----------
