
  // ---------- tab Rekap Gaji (semua pegawai, rincian berjajar horizontal) ----------
  let rgCabang = "";
  const pendekLokasi = (c) => String(c || "").replace(/^Tim Lapangan\s+/i, "");
  function kolomRekapGaji(rows) {
    const lokBk = [...new Set(rows.flatMap((r) => Object.keys(r.slip.kol.backupPer)))].sort();
    const K = (r) => r.slip.kol;
    const cols = [
      { l: "Gaji lapangan", f: (r) => K(r).gajiLapangan, tetap: true },
      { l: "Tunj. kehadiran", f: (r) => K(r).tunjHadir },
      ...lokBk.map((c) => ({ l: "Backup " + pendekLokasi(c), f: (r) => K(r).backupPer[c] || 0 })),
      { l: "Backup lain (manual)", f: (r) => K(r).backupManual },
      { l: "Insentif mengganti", f: (r) => K(r).mengganti },
      { l: "Home cleaning", f: (r) => K(r).hc },
      { l: "Lembur", f: (r) => K(r).lembur },
      { l: "Bonus & lain-lain", f: (r) => K(r).bonus },
      { l: "Kekurangan bulan lalu", f: (r) => K(r).kurang },
      { l: "Benefit BPJS (tunai)", f: (r) => K(r).bpjsTunai },
      { l: "Subsidi tambahan", f: (r) => K(r).subsidi },
      { l: "Total pendapatan", f: (r) => K(r).bruto, tetap: true, tot: true },
      { l: "Admin", f: (r) => K(r).admin, pot: true },
      { l: "Potongan BPJS", f: (r) => K(r).potBpjs, pot: true },
      { l: "Penalty", f: (r) => K(r).penalty, pot: true, tip: "telat, pulang cepat, loss, penalty resign, KPI" },
      { l: "Potongan absen", f: (r) => K(r).potAbsen, pot: true, tip: "tanpa keterangan dan izin" },
      { l: "Kasbon & potongan lain", f: (r) => K(r).potLain, pot: true },
      { l: "TOTAL", f: (r) => r.adaTarif ? Math.max(0, r.slip.thp + K(r).transfer) : 0, tetap: true, tot: true },
      { l: "Biaya transfer", f: (r) => K(r).transfer, pot: true },
      { l: "Ditransfer", f: (r) => r.GajiBersih || 0, tetap: true, tot: true }
    ];
    return cols.filter((c) => c.tetap || rows.some((r) => c.f(r)));
  }
  const LUAR_GRUP = "Di luar Kolabo";
  const grupRG = (r) => r.Luar || r.Manual ? LUAR_GRUP : r.Cabang;
  function barisRekapGaji(cabang) {
    const urut = (r) => (grupRG(r) === LUAR_GRUP ? "~" : "") + grupRG(r);
    return hasil.rekap.filter((r) => !cabang || grupRG(r) === cabang).sort((a, b) => urut(a).localeCompare(urut(b)) || a.Nama.localeCompare(b.Nama));
  }
  function renderRekapGaji() {
    const el = $("#tab-rgaji");
    if (!hasil) { el.innerHTML = kosong("Rekap gaji dibuat dari data absensi. Upload export Kolabo dulu."); bindUpload(el); return; }
    const rows = barisRekapGaji(rgCabang), cols = kolomRekapGaji(rows);
    const sel = (c) => c.tot ? ' class="n tot"' : ' class="n"';
    const sel2 = (c, v) => c.tot ? ' class="n tot"' : c.pot && v ? ' class="n neg"' : ' class="n"';
    const sel3 = (c) => c.tot ? " tot" : "";
    const sum = (arr, c) => sumBy(arr, (r) => c.f(r));
    const cabs = [...new Set(rows.map(grupRG))];
    let body = "";
    cabs.forEach((c) => {
      const rk = rows.filter((r) => grupRG(r) === c);
      rk.forEach((r) => {
        body += `<tr><td><b>${esc(r.Nama)}</b><br><span class="sub">${esc(r.Jabatan)}${r.slip.faktor < 1 ? " · " + esc(r.slip.ketProrata) : ""}</span></td><td>${esc(pendekLokasi(penempatan(r)))}</td>${cols.map((k) => { const v = k.f(r); return `<td${sel2(k, v)}>${!r.adaTarif && k.tot ? '<span class="pill warn">tarif kosong</span>' : v ? rp(v) : ""}</td>`; }).join("")}</tr>`;
      });
      if (!rgCabang && cabs.length > 1) body += `<tr class="sub"><td>Subtotal ${esc(pendekLokasi(c))}</td><td>${rk.length} org</td>${cols.map((k) => `<td${sel(k)}>${rp(sum(rk, k))}</td>`).join("")}</tr>`;
    });
    body += `<tr class="tot"><td>Total${rgCabang ? " " + esc(pendekLokasi(rgCabang)) : " semua lokasi"}</td><td>${rows.length} org</td>${cols.map((k) => `<td class="n${sel3(k)}">${rp(sum(rows, k))}</td>`).join("")}</tr>`;
    const nBk = hasil.backup.filter((o) => o.sev !== "konflik").length;
    el.innerHTML = lockBanner() + `<div class="stack"><div class="panel stack"><div class="row between"><div><h2>Rekap gaji ${bulanLabel(hasil.periode)}</h2>
      <p class="sub">Semua pegawai dengan rincian berjajar ke samping. Backup dihitung prorata dari gaji harian lokasi tempat backup (${nBk} backup tercatat), insentif mengganti dari extend shift dan masuk di hari off. Kolom yang semuanya kosong disembunyikan.</p></div>
      <div class="row"><select id="rg-cab" aria-label="Filter lokasi" style="width:auto"><option value="">Semua lokasi</option>${[...new Set(hasil.rekap.map(grupRG))].sort().map((c) => `<option value="${esc(c)}"${c === rgCabang ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <button class="btn small" id="rg-xls">Unduh Excel</button></div></div></div>
      <div class="scroll"><table class="rg"><thead><tr><th>Nama</th><th>Penempatan</th>${cols.map((k) => `<th class="n${sel3(k)}"${k.tip ? ` title="${esc(k.tip)}"` : ""}>${esc(k.l)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="hint">Merah = potongan. TOTAL = pendapatan − potongan sebelum biaya transfer; Ditransfer = yang dikirim ke rekening. Klik nama di Input Gaji untuk mengubah komponen.</p></div>`;
    $("#rg-cab").onchange = (e) => { rgCabang = e.target.value; renderRekapGaji(); };
    $("#rg-xls").onclick = async () => {
      try {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheetRekapGaji(barisRekapGaji(rgCabang)), "Rekap Gaji");
        await saveFile("Rekap_Gaji_Horizontal_" + hasil.periode + (rgCabang ? "_" + rgCabang.replace(/[^\w]+/g, "_") : "") + ".xlsx", XLSX.write(wb, { type: "array", bookType: "xlsx" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } catch (e) { setSaved("Unduhan gagal: " + (e.message || e)); }
    };
  }
  function sheetRekapGaji(rows) {
    const cols = kolomRekapGaji(rows);
    const aoa = [["Nama", "Penempatan", "Jabatan", ...cols.map((k) => k.l)]];
    [...new Set(rows.map(grupRG))].forEach((c) => {
      const rk = rows.filter((r) => grupRG(r) === c);
      rk.forEach((r) => aoa.push([r.Nama, penempatan(r), r.Jabatan, ...cols.map((k) => Math.round(k.f(r)))]));
      aoa.push(["Subtotal " + c, "", rk.length + " org", ...cols.map((k) => Math.round(sumBy(rk, k.f)))]);
    });
    aoa.push(["TOTAL", "", rows.length + " org", ...cols.map((k) => Math.round(sumBy(rows, k.f)))]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 26 }, { wch: 28 }, { wch: 16 }, ...cols.map(() => ({ wch: 14 }))];
    return ws;
  }
