
  // ---------- agregasi ----------
  function perCabang() {
    const m = new Map(), inv = cfg.invoice[hasil.periode] || {};
    hasil.rekap.forEach((r) => {
      if (!m.has(r.Cabang)) m.set(r.Cabang, { cabang: r.Cabang, n: 0, hadir: 0, terjadwal: 0, absen: 0, telat: 0, telatPot: 0, lembur: 0, lemburTak: 0, gaji: 0, biaya: 0, tarifKurang: 0, berubah: 0, tanpaJadwal: r.TanpaJadwal, order: 0, orderJam: 0 });
      const c = m.get(r.Cabang);
      c.n++; c.hadir += r.Hadir; c.terjadwal += r.Terjadwal; c.absen += r.Absen; c.telat += r.TelatKali; c.telatPot += r.TelatPot;
      c.lembur += r.LemburUpah; c.lemburTak += r.LemburTakDibayarJam; c.gaji += r.GajiBersih || 0; c.biaya += r.adaTarif ? r.Biaya : 0; c.berubah += r.ShiftBerubah;
      c.order += r.Order; c.orderJam += r.OrderJam;
      if (!r.adaTarif && r.Hadir > 0) c.tarifKurang++;
    });
    return [...m.values()].map((c) => Object.assign(c, { persen: c.terjadwal ? c.hadir / c.terjadwal : (c.tanpaJadwal ? 1 : 0), invoice: +inv[c.cabang] || 0 }));
  }
  function perHari() {
    const m = new Map();
    hasil.det.forEach((d) => {
      if (d.tanpaJadwal) return;
      if (!m.has(d.Tanggal)) m.set(d.Tanggal, { tgl: d.Tanggal, hari: d.Hari, hadir: 0, terjadwal: 0 });
      const x = m.get(d.Tanggal);
      if (d.Status === "Present") { x.hadir++; x.terjadwal++; } else if (d.Status !== "Off") x.terjadwal++;
    });
    return [...m.values()].sort((a, b) => a.tgl.localeCompare(b.tgl)).map((x) => Object.assign(x, { persen: x.terjadwal ? x.hadir / x.terjadwal : 0 }));
  }
  function simpanRiwayat() {
    if (!hasil) return;
    const cab = perCabang(), rk = hasil.rekap;
    const snap = { biaya: Math.round(sumBy(cab, (c) => c.biaya)), thp: Math.round(sumBy(rk, (r) => r.GajiBersih || 0)), invoice: Math.round(sumBy(cab, (c) => c.invoice)),
      pegawai: rk.length, hadir: sumBy(rk, (r) => r.Hadir), terjadwal: sumBy(rk, (r) => r.Terjadwal), telatPot: sumBy(rk, (r) => r.TelatPot),
      cab: Object.fromEntries(cab.map((c) => [c.cabang, { biaya: Math.round(c.biaya), invoice: c.invoice }])) };
    if (JSON.stringify(cfg.riwayat[hasil.periode]) !== JSON.stringify(snap)) { cfg.riwayat[hasil.periode] = snap; scheduleSave(); }
  }

  function insights(cab) {
    const out = [], rk = hasil.rekap;
    const rugi = cab.filter((c) => c.invoice && c.biaya > c.invoice).sort((a, b) => (a.invoice - a.biaya) - (b.invoice - b.biaya));
    if (rugi.length) out.push({ sev: "bad", what: `Biaya gaji melebihi invoice di ${rugi.length} lokasi`,
      act: rugi.map((c) => `${c.cabang}: biaya ${rp(c.biaya)}, invoice ${rp(c.invoice)}, rugi ${rp(c.biaya - c.invoice)}`).join("; ") + ". Cek kembali nilai kontrak, jumlah personel, dan lembur di lokasi ini." });
    const tipis = cab.filter((c) => c.invoice && c.biaya <= c.invoice && (c.invoice - c.biaya) / c.invoice < 0.1);
    if (tipis.length) out.push({ sev: "warn", what: `Margin di bawah 10% di ${tipis.length} lokasi`, act: tipis.map((c) => `${c.cabang} (${pct((c.invoice - c.biaya) / c.invoice)})`).join("; ") + "." });
    const tanpaInv = cab.filter((c) => !c.invoice && c.biaya);
    if (tanpaInv.length) out.push({ sev: "info", what: `${tanpaInv.length} lokasi belum diisi nilai invoice-nya`, act: "Isi di tabel Biaya vs invoice agar untung/rugi per lokasi terlihat: " + tanpaInv.map((c) => c.cabang).join(", ") + "." });
    const nol = rk.filter((r) => r.Hadir === 0 && r.Absen > 0);
    if (nol.length) {
      const g = sumBy(nol, (r) => r.gaji);
      out.push({ sev: "bad", what: `${nol.length} pegawai tidak pernah hadir sebulan penuh`,
        act: `${nol.map((r) => r.Nama).join(", ")}. Pastikan statusnya (resign, belum pakai Kolabo, atau cuti). Jika sudah tidak aktif, nonaktifkan di Kolabo.` + (g ? ` Gaji pokok yang masih tercatat ${rp(g)} per bulan.` : "") });
    }
    const rendah = cab.filter((c) => !c.tanpaJadwal && c.terjadwal && c.persen < AMBANG_HADIR).sort((a, b) => a.persen - b.persen);
    if (rendah.length) out.push({ sev: rendah[0].persen < 0.7 ? "bad" : "warn", what: `Kehadiran di bawah ${Math.round(AMBANG_HADIR * 100)}% di ${rendah.length} lokasi`,
      act: rendah.map((c) => `${c.cabang} (${pct(c.persen)}, ${c.absen} hari tanpa keterangan)`).join("; ") + ". Cek kecukupan personel dan apakah jadwal di Kolabo sesuai kenyataan." });
    const kena = rk.filter((r) => r.TelatKenaKali > 0).sort((a, b) => b.TelatKenaKali - a.TelatKenaKali || b.TelatMnt - a.TelatMnt);
    if (kena.length) out.push({ sev: "warn", what: `Telat lebih dari ${cfg.telatAmbang} menit terjadi ${sumBy(kena, (r) => r.TelatKenaKali)} kali, potongan ${rp(sumBy(kena, (r) => r.TelatPot))}`,
      act: "Paling sering: " + kena.slice(0, 3).map((r) => `${r.Nama} (${r.TelatKenaKali}×, ${r.TelatMnt} mnt)`).join(", ") + ". Jika ada yang telat karena tukar shift resmi, koreksi di Rekap Absensi." });
    const hadir = sumBy(rk, (r) => r.Hadir), berubah = sumBy(rk, (r) => r.ShiftBerubah);
    if (hadir && berubah / hadir > 0.1) {
      const top = [...cab].sort((a, b) => b.berubah - a.berubah).slice(0, 3).filter((c) => c.berubah);
      out.push({ sev: "warn", what: `${pct(berubah / hadir)} hari kerja dijalankan di shift yang berbeda dari jadwal Kolabo`,
        act: "Paling banyak di " + top.map((c) => `${c.cabang} (${c.berubah} hari)`).join(", ") + ". Perbarui jadwal di Kolabo. Sistem ini sudah menyesuaikan telat otomatis." });
    }
    const tak = sumBy(rk, (r) => r.LemburTakDibayarJam);
    if (tak >= 1) {
      const top = [...cab].sort((a, b) => b.lemburTak - a.lemburTak).slice(0, 3).filter((c) => c.lemburTak >= 0.5);
      out.push({ sev: "info", what: `${jam(tak)} lewat jam pulang belum dibayar sebagai lembur`,
        act: "Terbanyak di " + top.map((c) => `${c.cabang} (${jam(c.lemburTak)})`).join(", ") + ". Jika lembur disetujui, tambahkan aturan lembur di Aturan atau koreksi per hari di Rekap Absensi." });
    }
    const hc = cab.filter((c) => c.tanpaJadwal);
    hc.forEach((c) => out.push({ sev: "info", what: `${c.cabang}: ${c.order} order, ${c.orderJam} jam kerja`, act: `Dihitung dari check-in Kolabo (tanpa jadwal tetap), dibayar sesuai tabel tarif home cleaning. Biaya ${rp(c.biaya)}.` }));
    const tk = rk.filter((r) => !r.adaTarif && r.Hadir > 0);
    if (tk.length) out.push({ sev: "warn", what: `${tk.length} pegawai belum punya gaji pokok, slip dan total biaya belum lengkap`,
      act: "Isi di Tarif Gaji: " + [...new Set(tk.map((r) => r.Cabang + " / " + r.Posisi))].join("; ") + "." });
    const dq = hasil.review.filter((v) => v.Alasan.startsWith("NIP"));
    if (dq.length) out.push({ sev: "info", what: `${dq.length} masalah data NIP di Kolabo`, act: dq.map((v) => `${v.Nama}: ${v.Alasan}`).join("; ") + "." });
    if (!out.length) out.push({ sev: "ok", what: "Tidak ada masalah besar bulan ini", act: "Kehadiran, keterlambatan, biaya, dan lembur dalam batas wajar." });
    const order = { bad: 0, warn: 1, info: 2, ok: 3 };
    return out.sort((a, b) => order[a.sev] - order[b.sev]);
  }

  // ---------- grafik ----------
  function hbars(items, fmt, opts) {
    const max = Math.max(...items.map((x) => x.v), opts && opts.max || 0) || 1;
    return '<div class="hbars">' + items.map((x) =>
      `<div class="hbar" data-tip="${esc(x.tip || "")}"><div class="nm">${esc(x.label)}</div><div class="tr"><div class="fl ${x.warn ? "warn" : ""}" style="width:${Math.max(0.5, x.v / max * 100)}%"></div></div><div class="vl">${fmt(x.v)}</div></div>`).join("") + "</div>";
  }
  function pairBars(cab) {
    const max = Math.max(...cab.map((c) => Math.max(c.biaya, c.invoice))) || 1;
    return '<div class="hbars">' + cab.map((c) => {
      const tip = `${c.cabang}: biaya ${rp(c.biaya)}` + (c.invoice ? `, invoice ${rp(c.invoice)}, ${c.invoice >= c.biaya ? "margin" : "rugi"} ${rp(Math.abs(c.invoice - c.biaya))}` : ", invoice belum diisi");
      return `<div class="hbar" data-tip="${esc(tip)}"><div class="nm">${esc(c.cabang)}</div><div style="display:flex;flex-direction:column;gap:3px"><div class="tr" style="height:10px"><div class="fl ${c.invoice && c.biaya > c.invoice ? "warn" : ""}" style="width:${Math.max(0.5, c.biaya / max * 100)}%"></div></div><div class="tr" style="height:10px"><div class="fl" style="background:var(--info);width:${c.invoice ? Math.max(0.5, c.invoice / max * 100) : 0}%"></div></div></div><div class="vl">${c.invoice ? (c.invoice >= c.biaya ? "+" : "−") + pct(Math.abs(c.invoice - c.biaya) / c.invoice) : "—"}</div></div>`;
    }).join("") + `</div><div class="legend"><span><i style="background:var(--bar)"></i>Biaya tenaga kerja</span><span><i style="background:var(--warn-bar)"></i>Biaya melebihi invoice</span><span><i style="background:var(--info)"></i>Invoice</span><span>Angka kanan: margin terhadap invoice</span></div>`;
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
      const tip = `${d.hari} ${tglPendek(d.tgl)}: ${d.hadir} hadir dari ${d.terjadwal} terjadwal (${pct(d.persen)})`;
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
    const rk = hasil.rekap, cab = perCabang(), hr = perHari();
    const hadir = sumBy(rk, (r) => r.Hadir), terj = sumBy(rk, (r) => r.Terjadwal);
    const biaya = sumBy(cab, (c) => c.biaya), thp = sumBy(rk, (r) => r.GajiBersih || 0), inv = sumBy(cab, (c) => c.invoice);
    const invCab = cab.filter((c) => c.invoice), biayaInv = sumBy(invCab, (c) => c.biaya), margin = inv - biayaInv;
    const sev = { bad: ["bad", "Kritis"], warn: ["warn", "Perhatian"], info: ["", "Info"], ok: ["ok", "Baik"] };
    const per = Object.keys(cfg.riwayat).sort(), prevP = per.filter((p) => p < hasil.periode).pop(), prev = prevP ? cfg.riwayat[prevP] : null;
    const delta = (now, old) => old ? `${now >= old ? "naik" : "turun"} ${pct(Math.abs(now - old) / (old || 1))} dari ${bulanLabel(prevP)}` : "";
    // progres kerja bulanan
    const tarifKurang = rk.filter((r) => !r.adaTarif && r.Hadir > 0).length, bul = cfg.bulanan[hasil.periode] || {};
    const steps = [
      [true, "Data Kolabo diupload", `${rk.length} pegawai, ${hasil.det.length} baris absensi`, ""],
      [!hasil.review.length, "Absensi dicek", hasil.review.length ? `${hasil.review.length} kasus perlu dicek` : "semua kasus sudah dicek", "rekap"],
      [!tarifKurang, "Tarif gaji lengkap", tarifKurang ? `${tarifKurang} pegawai belum ada gaji pokok` : "semua pegawai punya tarif", "gaji"],
      [Object.keys(bul).length > 0, "Komponen variabel diisi", `${Object.keys(bul).length} pegawai punya input bulan ini (bonus, HC, kasbon)`, "input"],
      [invCab.length === cab.length, "Invoice per lokasi diisi", `${invCab.length} dari ${cab.length} lokasi`, "#inv"],
      [rk.filter((r) => r.adaTarif && r.Pendapatan > 0).length > 0, "Slip siap diunduh", `${rk.filter((r) => r.adaTarif && r.Pendapatan > 0).length} slip siap`, "slip"],
      [terkunci(), "Disetujui & dikunci", terkunci() ? `oleh ${cfg.approval[hasil.periode].oleh}` : "masih draft", "slip"]
    ];
    let h = `<div class="stack"><div class="panel"><div class="row between"><h2>Progres rekap gaji ${bulanLabel(hasil.periode)}</h2>
      <div class="row"><span class="hint">Unduh isi dashboard:</span><button class="btn ghost small" id="lap-xls">Laporan Excel</button><button class="btn small" id="lap-pdf">Laporan PDF untuk manajemen</button></div></div><div class="steps" style="margin-top:12px">${steps.map((s, i) => `<div class="step ${s[0] ? "done" : ""}"><div class="no">${s[0] ? "✓" : i + 1}</div><div><b>${s[1]}</b><span class="sub">${s[2]}${s[3] ? ` · ${s[3].startsWith("#") ? `<a href="${s[3]}">isi</a>` : `<a href="#" data-go="${s[3]}">buka</a>`}` : ""}</span></div></div>`).join("")}</div></div>`;
    h += `<h2>Penggajian</h2><div class="kpis">
      <div class="kpi"><div class="l">Biaya tenaga kerja</div><div class="v">${rp(biaya)}</div><div class="s">pendapatan bruto + benefit perusahaan${prev ? "<br>" + delta(biaya, prev.biaya) : ""}</div></div>
      <div class="kpi"><div class="l">Gaji ditransfer</div><div class="v">${rp(thp)}</div><div class="s">total take home pay ${rk.filter((r) => r.adaTarif).length} pegawai</div></div>
      <div class="kpi"><div class="l">Total invoice</div><div class="v">${inv ? rp(inv) : "—"}</div><div class="s">${invCab.length} dari ${cab.length} lokasi diisi</div></div>
      <div class="kpi"><div class="l">${margin >= 0 ? "Margin" : "Rugi"} (lokasi ber-invoice)</div><div class="v" style="color:${!inv ? "inherit" : margin >= 0 ? "var(--accent)" : "var(--bad)"}">${inv ? rp(Math.abs(margin)) : "—"}</div><div class="s">${inv ? pct(Math.abs(margin) / inv) + " dari invoice" : "isi invoice di tabel bawah"}</div></div>
      <div class="kpi"><div class="l">Potongan terkumpul</div><div class="v">${rp(sumBy(rk, (r) => r.Potongan))}</div><div class="s">telat ${rp(sumBy(rk, (r) => r.TelatPot))} · BPJS, kasbon, dll</div></div>
    </div>`;
    h += '<div class="panel"><h2>Yang perlu diputuskan bulan ini</h2><p class="sub">Disusun otomatis dari data, urut dari yang paling penting.</p><div class="insights" style="margin-top:6px">' +
      insights(cab).map((x) => `<div class="ins"><div><span class="pill ${sev[x.sev][0]}">${sev[x.sev][1]}</span></div><div><div class="what">${esc(x.what)}</div><div class="act">${esc(x.act)}</div></div></div>`).join("") + "</div></div>";
    // biaya vs invoice
    const cabB = [...cab].sort((a, b) => b.biaya - a.biaya);
    h += `<div class="panel stack" id="inv"><div><h2>Biaya gaji vs invoice per lokasi</h2><p class="sub">Isi nilai invoice yang dikirim ke klien bulan ini. Selisih merah berarti biaya gaji lebih besar dari tagihan.</p></div>${pairBars(cabB)}
      <div class="scroll"><table><thead><tr><th>Lokasi</th><th class="n">Pegawai</th><th class="n">Gaji ditransfer</th><th class="n">Benefit perusahaan</th><th class="n">Biaya tenaga kerja</th><th class="n">Invoice (Rp)</th><th class="n">Selisih</th><th class="n">Margin</th></tr></thead><tbody>
      ${cabB.map((c, i) => { const sel = c.invoice - c.biaya; const ben = sumBy(rk.filter((r) => r.Cabang === c.cabang && r.adaTarif), (r) => r.Benefit); return `<tr><td>${esc(c.cabang)}${c.tarifKurang ? ` <span class="pill warn">${c.tarifKurang} tanpa tarif</span>` : ""}</td><td class="n">${c.n}</td><td class="n">${rp(c.gaji)}</td><td class="n">${rp(ben)}</td><td class="n"><b>${rp(c.biaya)}</b></td>
        <td class="n"><input type="number" id="inv-${i}" data-inv="${esc(c.cabang)}" value="${c.invoice || ""}" min="0" step="100000" placeholder="0" style="width:150px;text-align:right" aria-label="Invoice ${esc(c.cabang)}"></td>
        <td class="n">${c.invoice ? `<span style="color:${sel >= 0 ? "var(--accent)" : "var(--bad)"}">${sel >= 0 ? "+" : "−"}${rp(Math.abs(sel))}</span>` : "—"}</td><td class="n">${c.invoice ? (sel < 0 ? '<span class="pill bad">rugi ' : sel / c.invoice < 0.1 ? '<span class="pill warn">' : '<span class="pill ok">') + pct(sel / c.invoice) + "</span>" : "—"}</td></tr>`; }).join("")}
      <tr class="tot"><td>Total</td><td class="n">${rk.length}</td><td class="n">${rp(thp)}</td><td class="n">${rp(sumBy(rk, (r) => r.adaTarif ? r.Benefit : 0))}</td><td class="n">${rp(biaya)}</td><td class="n">${rp(inv)}</td><td class="n">${inv ? (margin >= 0 ? "+" : "−") + rp(Math.abs(margin)) : "—"}</td><td class="n">${inv ? pct(margin / inv) : "—"}</td></tr></tbody></table></div></div>`;
    // komposisi biaya
    const komp = [["Gaji pokok", (r) => r.slip.pend[0].items[0][1]], ["Tunjangan tetap", (r) => r.slip.pend[0].total - r.slip.pend[0].items[0][1]], ["Home cleaning", (r) => r.slip.pend[1].total],
      ["Project", (r) => r.slip.pend[2].total], ["Bonus & insentif", (r) => r.slip.pend[3].total + r.slip.pend[4].items[0][1]], ["Lembur", (r) => r.slip.pend[4].items[1][1] + r.slip.pend[4].items[2][1]],
      ["Lain-lain & adjustment", (r) => r.slip.pend[4].total - r.slip.pend[4].items[0][1] - r.slip.pend[4].items[1][1] - r.slip.pend[4].items[2][1]], ["Benefit perusahaan (BPJS dll)", (r) => r.Benefit]]
      .map(([l, f]) => ({ label: l, v: sumBy(rk.filter((r) => r.adaTarif), f) })).filter((x) => x.v > 0);
    h += '<div class="cols2">';
    h += `<div class="panel"><h2>Komposisi biaya tenaga kerja</h2><p class="sub">Dari mana biaya gaji bulan ini berasal.</p>${komp.length ? hbars(komp.map((x) => Object.assign(x, { tip: `${x.label}: ${rp(x.v)} (${pct(x.v / (biaya || 1))} dari biaya)` })), rp) : '<p class="empty">Isi tarif gaji dulu.</p>'}</div>`;
    const byG = [...cab].sort((a, b) => b.biaya - a.biaya);
    h += `<div class="panel"><h2>Biaya per pegawai per lokasi</h2><p class="sub">Rata-rata biaya tenaga kerja per orang. Berguna untuk menghitung harga kontrak.</p>${hbars(byG.filter((c) => c.biaya).map((c) => ({ label: c.cabang, v: c.biaya / c.n, tip: `${c.cabang}: ${rp(c.biaya)} untuk ${c.n} pegawai` })), rp)}</div>`;
    h += "</div>";
    // tren
    if (per.length > 1) {
      h += `<div class="stack" style="gap:8px"><h2>Tren bulanan</h2><div class="scroll"><table><thead><tr><th>Bulan</th><th class="n">Pegawai</th><th class="n">Kehadiran</th><th class="n">Biaya tenaga kerja</th><th class="n">Gaji ditransfer</th><th class="n">Invoice</th><th class="n">Margin</th><th class="n">Potongan telat</th></tr></thead><tbody>${per.map((p) => { const x = cfg.riwayat[p]; return `<tr${p === hasil.periode ? ' style="font-weight:700"' : ""}><td>${bulanLabel(p)}</td><td class="n">${x.pegawai}</td><td class="n">${pct(x.terjadwal ? x.hadir / x.terjadwal : 0)}</td><td class="n">${rp(x.biaya)}</td><td class="n">${rp(x.thp)}</td><td class="n">${x.invoice ? rp(x.invoice) : "—"}</td><td class="n">${x.invoice ? pct((x.invoice - Object.values(x.cab).filter((c) => c.invoice).reduce((a, c) => a + c.biaya, 0)) / x.invoice) : "—"}</td><td class="n">${rp(x.telatPot)}</td></tr>`; }).join("")}</tbody></table></div></div>`;
    }
    // absensi
    const cabA = cab.filter((c) => !c.tanpaJadwal).sort((a, b) => a.persen - b.persen);
    h += `<h2 style="margin-top:8px">Absensi</h2><div class="kpis">
      <div class="kpi"><div class="l">Tingkat kehadiran</div><div class="v">${pct(terj ? hadir / terj : 0)}</div><div class="s">${num(hadir)} hadir dari ${num(terj)} hari terjadwal${prev && prev.terjadwal ? "<br>" + bulanLabel(prevP) + ": " + pct(prev.hadir / prev.terjadwal) : ""}</div></div>
      <div class="kpi"><div class="l">Tanpa keterangan</div><div class="v">${num(sumBy(rk, (r) => r.Absen))} hari</div><div class="s">izin ${sumBy(rk, (r) => r.Izin)} · sakit ${sumBy(rk, (r) => r.Sakit)} · cuti ${sumBy(rk, (r) => r.Cuti)}</div></div>
      <div class="kpi"><div class="l">Telat &gt; ${cfg.telatAmbang} menit</div><div class="v">${num(sumBy(rk, (r) => r.TelatKenaKali))}×</div><div class="s">potongan ${rp(sumBy(rk, (r) => r.TelatPot))}</div></div>
      <div class="kpi"><div class="l">Lembur dibayar</div><div class="v">${rp(sumBy(rk, (r) => r.LemburUpah))}</div><div class="s">${jam(sumBy(rk, (r) => r.LemburJam))} · ${jam(sumBy(rk, (r) => r.LemburTakDibayarJam))} belum diputuskan</div></div>
      <div class="kpi"><div class="l">Perlu dicek</div><div class="v">${hasil.review.length}</div><div class="s">kasus, <a href="#" data-go="rekap">buka Rekap Absensi</a></div></div>
    </div>`;
    h += '<div class="cols2">';
    h += '<div class="panel"><h2>Kehadiran per lokasi</h2><p class="sub">Hari hadir dibanding hari terjadwal. Terendah di atas. Lokasi tanpa jadwal tetap tidak dihitung.</p>' +
      hbars(cabA.map((c) => ({ label: c.cabang, v: c.persen, warn: c.persen < AMBANG_HADIR, tip: `${c.cabang}: ${c.hadir} hadir dari ${c.terjadwal} hari terjadwal, ${c.n} pegawai` })), pct, { max: 1 }) + legenda() + "</div>";
    const telat = [...rk].filter((r) => r.TelatMnt > 0).sort((a, b) => b.TelatMnt - a.TelatMnt).slice(0, 8);
    h += '<div class="panel"><h2>Paling banyak telat</h2><p class="sub">Total menit telat, dihitung dari shift yang benar-benar dijalankan.</p>' +
      (telat.length ? hbars(telat.map((r) => ({ label: r.Nama, v: r.TelatMnt, tip: `${r.Nama} (${r.Cabang}): ${r.TelatKali}× telat, ${r.TelatKenaKali}× kena potongan ${rp(r.TelatPot)}` })), (v) => num(v) + " mnt") : '<p class="empty">Tidak ada yang telat.</p>') + "</div>";
    h += "</div>";
    h += `<div class="panel chart"><h2>Kehadiran harian</h2><p class="sub">Persentase pegawai terjadwal yang hadir tiap tanggal. Arahkan kursor ke batang untuk detail.</p>${kolomHarian(hr)}${legenda()}
      <details style="margin-top:10px"><summary class="hint">Lihat sebagai tabel</summary><div class="scroll" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Hari</th><th class="n">Hadir</th><th class="n">Terjadwal</th><th class="n">Kehadiran</th></tr></thead><tbody>${hr.map((d) => `<tr><td>${d.tgl}</td><td>${esc(d.hari)}</td><td class="n">${d.hadir}</td><td class="n">${d.terjadwal}</td><td class="n">${pct(d.persen)}</td></tr>`).join("")}</tbody></table></div></details></div>`;
    h += "</div>";
    el.innerHTML = h;
    bindUpload(el);
    $("#lap-xls").onclick = unduhLaporanExcel; $("#lap-pdf").onclick = unduhLaporanPDF;
    el.querySelectorAll("[data-inv]").forEach((inp) => inp.addEventListener("change", () => {
      const b = cfg.invoice[hasil.periode] = cfg.invoice[hasil.periode] || {};
      if (inp.value === "" || +inp.value === 0) delete b[inp.dataset.inv]; else b[inp.dataset.inv] = +inp.value;
      scheduleSave();
      setTimeout(() => { const next = document.activeElement && document.activeElement.id; const y0 = window.scrollY; renderDash(); simpanRiwayat(); window.scrollTo(0, y0); if (next && $("#" + next)) $("#" + next).focus(); }, 0);
    }));
  }
