
  // ---------- data untuk laporan & Excel ----------
  function dataTransfer() {
    return [...hasil.rekap].filter((r) => r.adaTarif && r.Pendapatan > 0).sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama)).map((r, i) => {
      const P = cfg.pegawai[r.key] || {};
      return { No: i + 1, "No. Slip": r.NoSlip, Nama: r.Nama, NIP: r.NIP, Lokasi: r.Cabang, Bank: P.bank || "", "No. Rekening": P.noRek || "", "Atas Nama": P.atasNama || r.Nama, "Nominal Transfer": Math.round(r.GajiBersih || 0), Keterangan: (P.noRek ? "" : "rekening belum diisi") };
    });
  }
  function dataLogKoreksi() {
    const rows = hasil.det.filter((d) => d.adj).map((d) => ({
      Tanggal: d.Tanggal, Nama: d.Nama, NIP: d.NIP, Lokasi: d.Cabang,
      "Status Sistem": STATUS_LABEL[d.auto.status], "Status Akhir": STATUS_LABEL[d.Status],
      "Telat Sistem (mnt)": d.auto.telat, "Telat Akhir (mnt)": d["Telat (mnt)"], "Lembur Sistem (jam)": d.auto.lembur, "Lembur Akhir (jam)": d["Lembur Dibayar (jam)"],
      Alasan: d.adj.ket || ""
    }));
    return rows.length ? rows : [{ Info: "Tidak ada koreksi manual bulan ini" }];
  }
  function dataLaporan() {
    const rk = hasil.rekap, cab = perCabang().sort((a, b) => a.cabang.localeCompare(b.cabang));
    const hadir = sumBy(rk, (r) => r.Hadir), terj = sumBy(rk, (r) => r.Terjadwal);
    const biaya = sumBy(cab, (c) => c.biaya), thp = sumBy(rk, (r) => r.GajiBersih || 0), inv = sumBy(cab, (c) => c.invoice);
    const biayaInv = sumBy(cab.filter((c) => c.invoice), (c) => c.biaya);
    const ap = cfg.approval[hasil.periode];
    const kpi = [
      ["Periode", bulanLabel(hasil.periode)], ["Status", ap ? `Disetujui oleh ${ap.oleh}, ${ap.tanggal}` : "Draft (belum disetujui)"],
      ["Jumlah pegawai", rk.length], ["Biaya tenaga kerja (Rp)", Math.round(biaya)], ["Gaji ditransfer (Rp)", Math.round(thp)],
      ["Total invoice (Rp)", Math.round(inv)], ["Margin lokasi ber-invoice (Rp)", inv ? Math.round(inv - biayaInv) : ""], ["Margin (%)", inv ? Math.round((inv - biayaInv) / inv * 1000) / 10 : ""],
      ["Total potongan (Rp)", Math.round(sumBy(rk, (r) => r.Potongan))], ["Tingkat kehadiran (%)", terj ? Math.round(hadir / terj * 1000) / 10 : ""],
      ["Hari tanpa keterangan", sumBy(rk, (r) => r.Absen)], ["Telat dipotong (kali)", sumBy(rk, (r) => r.TelatKenaKali)], ["Potongan telat (Rp)", sumBy(rk, (r) => r.TelatPot)],
      ["Lembur dibayar (Rp)", Math.round(sumBy(rk, (r) => r.LemburUpah))], ["Kasus perlu dicek", hasil.review.length], ["Koreksi manual", hasil.det.filter((d) => d.adj).length]
    ];
    const keputusan = insights(perCabang()).map((x) => ({ Tingkat: { bad: "Kritis", warn: "Perhatian", info: "Info", ok: "Baik" }[x.sev], Temuan: x.what, Tindakan: x.act }));
    const biayaInvoice = cab.map((c) => ({ Lokasi: c.cabang, Pegawai: c.n, "Gaji Ditransfer": Math.round(c.gaji), "Biaya Tenaga Kerja": Math.round(c.biaya), Invoice: c.invoice || "", Selisih: c.invoice ? Math.round(c.invoice - c.biaya) : "", "Margin (%)": c.invoice ? Math.round((c.invoice - c.biaya) / c.invoice * 1000) / 10 : "", "Biaya per Pegawai": Math.round(c.biaya / Math.max(1, c.n)) }));
    const kehadiran = cab.map((c) => ({ Lokasi: c.cabang, Pegawai: c.n, Hadir: c.hadir, Terjadwal: c.terjadwal, "Kehadiran (%)": c.tanpaJadwal ? "sesuai order" : Math.round(c.persen * 1000) / 10, "Tanpa Keterangan": c.absen, "Telat (kali)": c.telat, "Potongan Telat": c.telatPot, "Upah Lembur": Math.round(c.lembur), "Lembur Belum Diputuskan (jam)": Math.round(c.lemburTak * 10) / 10 }));
    const pegawai = [...rk].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama)).map((r) => ({ "No. Slip": r.NoSlip, Nama: r.Nama, Lokasi: r.Cabang, Jabatan: r.Jabatan, Hadir: r.Hadir, Terjadwal: r.Terjadwal, "Tanpa Ket.": r.Absen, "Telat Dipotong": r.TelatKenaKali, "Pendapatan Bruto": Math.round(r.Pendapatan), Potongan: Math.round(r.Potongan), "Gaji Diterima": r.GajiBersih == null ? "" : Math.round(r.GajiBersih), "Biaya Tenaga Kerja": r.adaTarif ? Math.round(r.Biaya) : "" }));
    const komp = [["Gaji pokok", (r) => r.slip.pend[0].items[0][1]], ["Tunjangan tetap", (r) => r.slip.pend[0].total - r.slip.pend[0].items[0][1]], ["Home cleaning", (r) => r.slip.pend[1].total], ["Project", (r) => r.slip.pend[2].total], ["Bonus & insentif", (r) => r.slip.pend[3].total], ["Lain-lain, lembur & adjustment", (r) => r.slip.pend[4].total], ["Benefit perusahaan", (r) => r.Benefit]]
      .map(([l, f]) => ({ Komponen: l, "Jumlah (Rp)": Math.round(sumBy(rk.filter((r) => r.adaTarif), f)) }));
    const harian = perHari().map((d) => ({ Tanggal: d.tgl, Hari: d.hari, Hadir: d.hadir, Terjadwal: d.terjadwal, "Kehadiran (%)": Math.round(d.persen * 1000) / 10 }));
    const tren = Object.keys(cfg.riwayat).sort().map((p) => { const x = cfg.riwayat[p]; return { Bulan: bulanLabel(p), Pegawai: x.pegawai, "Kehadiran (%)": x.terjadwal ? Math.round(x.hadir / x.terjadwal * 1000) / 10 : "", "Biaya Tenaga Kerja": x.biaya, "Gaji Ditransfer": x.thp, Invoice: x.invoice || "", "Potongan Telat": x.telatPot }; });
    return { kpi, keputusan, biayaInvoice, kehadiran, pegawai, komp, harian, tren, ap, cab, rk };
  }
  async function unduhLaporanExcel() {
    try {
      const L = dataLaporan(), wb = XLSX.utils.book_new(), add = (rows, nm) => XLSX.utils.book_append_sheet(wb, Array.isArray(rows[0]) ? XLSX.utils.aoa_to_sheet(rows) : XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "Tidak ada data" }]), nm);
      add([["Laporan Absensi & Penggajian", namaPT()], [], ...L.kpi], "Ringkasan");
      add(L.keputusan, "Perlu Diputuskan");
      add(L.biayaInvoice, "Biaya vs Invoice");
      add(L.komp, "Komposisi Biaya");
      add(L.kehadiran, "Kehadiran per Lokasi");
      add(L.harian, "Kehadiran Harian");
      add(L.pegawai, "Gaji per Pegawai");
      add(dataTransfer(), "Daftar Transfer");
      add(dataLogKoreksi(), "Log Koreksi");
      add(L.tren, "Tren Bulanan");
      await saveFile("Laporan_Gaji_" + hasil.periode + ".xlsx", XLSX.write(wb, { type: "array", bookType: "xlsx" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) { setSaved("Unduhan gagal: " + (e.message || e)); }
  }

  // ---------- laporan manajemen PDF ----------
  async function unduhLaporanPDF() {
    try {
      if (!window.jspdf) throw new Error("Pembuat PDF belum termuat. Periksa koneksi lalu muat ulang halaman.");
      const L = dataLaporan(), doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const G = [14, 92, 61], INK = [27, 36, 48], MUTED = [93, 104, 116], SOFT = [238, 244, 241], LINE = [221, 227, 232], RED = [179, 38, 30], AMB = [154, 91, 0];
      const X0 = 14, X1 = 196, W = X1 - X0, BOTTOM = 280;
      const rpT = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
      let y;
      const kepala = (first) => {
        if (!L.ap) watermark(doc, "DRAFT");
        doc.setFillColor(...G); doc.rect(0, 0, 210, first ? 32 : 16, "F");
        const tx = X0 + logoPDF(doc, X0, first ? 6 : 2, first ? 20 : 12);
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
        if (first) {
          namaPDF(doc, tx, 14, 120 - (tx - X0));
          doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Laporan Absensi & Penggajian", tx, 21);
          doc.setFontSize(9); doc.text(cfg.alamat || "", tx, 26.5);
          doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(bulanLabel(hasil.periode), X1, 14, { align: "right" });
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(L.ap ? `Disetujui: ${L.ap.oleh}, ${L.ap.tanggal}` : "DRAFT · belum disetujui", X1, 21, { align: "right" });
          doc.text("Dicetak " + tglPanjang(new Date()), X1, 26.5, { align: "right" });
          y = 42;
        } else {
          doc.setFontSize(10); doc.text(namaPT() + " · Laporan Absensi & Penggajian " + bulanLabel(hasil.periode), tx, 10);
          y = 26;
        }
      };
      const baru = () => { doc.addPage(); kepala(false); };
      const judul = (t, sub) => {
        if (y > BOTTOM - 20) baru();
        doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...G); doc.text(t, X0, y);
        doc.setDrawColor(...G); doc.setLineWidth(0.4); doc.line(X0, y + 1.8, X1, y + 1.8); y += 7;
        if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(sub, X0, y); y += 5; }
      };
      const tabel = (cols, rows, opt) => {
        const tot = cols.reduce((a, c) => a + c.w, 0), sc = W / tot;
        const head = () => {
          doc.setFillColor(...SOFT); doc.rect(X0, y - 4, W, 6.5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...MUTED);
          let x = X0; cols.forEach((c) => { const cw = c.w * sc; doc.text(c.t, c.r ? x + cw - 1.5 : x + 1.5, y, { align: c.r ? "right" : "left" }); x += cw; }); y += 6;
        };
        head();
        rows.forEach((row, ri) => {
          const isTot = opt && opt.total && ri === rows.length - 1;
          if (y > BOTTOM) { baru(); head(); }
          doc.setFont("helvetica", isTot ? "bold" : "normal"); doc.setFontSize(8.5);
          let x = X0;
          cols.forEach((c, ci) => {
            const cw = c.w * sc, v = row[ci];
            const col = typeof v === "object" && v ? v : { t: v };
            doc.setTextColor(...(col.c || INK));
            doc.text(doc.splitTextToSize(String(col.t == null ? "" : col.t), cw - 3)[0] || "", c.r ? x + cw - 1.5 : x + 1.5, y, { align: c.r ? "right" : "left" });
            x += cw;
          });
          doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(X0, y + 1.8, X1, y + 1.8);
          y += 5.6;
        });
        y += 4;
      };

      kepala(true);
      // ringkasan angka
      const rk = L.rk, cab = L.cab;
      const biaya = sumBy(cab, (c) => c.biaya), inv = sumBy(cab, (c) => c.invoice), biayaInv = sumBy(cab.filter((c) => c.invoice), (c) => c.biaya), margin = inv - biayaInv;
      const hadir = sumBy(rk, (r) => r.Hadir), terj = sumBy(rk, (r) => r.Terjadwal);
      const kotak = [["Biaya tenaga kerja", rpT(biaya)], ["Gaji ditransfer", rpT(sumBy(rk, (r) => r.GajiBersih || 0))], ["Total invoice", inv ? rpT(inv) : "-"],
        [margin >= 0 ? "Margin" : "Rugi", inv ? rpT(Math.abs(margin)) + " (" + pct(Math.abs(margin) / inv) + ")" : "-", inv ? (margin >= 0 ? G : RED) : INK],
        ["Kehadiran", pct(terj ? hadir / terj : 0)], ["Telat dipotong", sumBy(rk, (r) => r.TelatKenaKali) + "x · " + rpT(sumBy(rk, (r) => r.TelatPot))]];
      const kw = W / 3;
      kotak.forEach((k, i) => {
        const x = X0 + (i % 3) * kw, yy = y + Math.floor(i / 3) * 17;
        doc.setFillColor(...SOFT); doc.rect(x + 0.5, yy, kw - 1, 15, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(k[0], x + 4, yy + 5.5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...(k[2] || INK)); doc.text(k[1], x + 4, yy + 12);
      });
      y += 40;
      // keputusan
      judul("Yang perlu diputuskan", "Disusun otomatis dari data absensi dan penggajian.");
      L.keputusan.forEach((k) => {
        const warna = k.Tingkat === "Kritis" ? RED : k.Tingkat === "Perhatian" ? AMB : MUTED;
        const t1 = doc.splitTextToSize(k.Temuan, W - 24), t2 = doc.splitTextToSize(k.Tindakan, W - 24);
        if (y + (t1.length + t2.length) * 4.2 > BOTTOM) baru();
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...warna); doc.text(k.Tingkat.toUpperCase(), X0, y);
        doc.setFontSize(9); doc.setTextColor(...INK); doc.text(t1, X0 + 22, y); y += t1.length * 4.2;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(t2, X0 + 22, y); y += t2.length * 4 + 3;
      });
      y += 2;
      // biaya vs invoice
      judul("Biaya gaji vs invoice per lokasi", "Biaya tenaga kerja = pendapatan bruto + benefit perusahaan. Merah = biaya melebihi invoice.");
      tabel([{ t: "Lokasi", w: 46 }, { t: "Pegawai", w: 14, r: 1 }, { t: "Gaji ditransfer", w: 26, r: 1 }, { t: "Biaya", w: 26, r: 1 }, { t: "Invoice", w: 26, r: 1 }, { t: "Selisih", w: 26, r: 1 }, { t: "Margin", w: 16, r: 1 }],
        cab.map((c) => { const s = c.invoice - c.biaya; const cl = !c.invoice ? INK : s < 0 ? RED : G; return [c.cabang, c.n, rpT(c.gaji), rpT(c.biaya), c.invoice ? rpT(c.invoice) : "-", c.invoice ? { t: (s >= 0 ? "+" : "-") + rpT(Math.abs(s)), c: cl } : "-", c.invoice ? { t: pct(s / c.invoice), c: cl } : "-"]; })
          .concat([["Total", rk.length, rpT(sumBy(rk, (r) => r.GajiBersih || 0)), rpT(biaya), inv ? rpT(inv) : "-", inv ? (margin >= 0 ? "+" : "-") + rpT(Math.abs(margin)) : "-", inv ? pct(margin / inv) : "-"]]), { total: 1 });
      // komposisi
      judul("Komposisi biaya tenaga kerja");
      tabel([{ t: "Komponen", w: 70 }, { t: "Jumlah", w: 40, r: 1 }, { t: "Porsi", w: 25, r: 1 }], L.komp.filter((k) => k["Jumlah (Rp)"]).map((k) => [k.Komponen, rpT(k["Jumlah (Rp)"]), pct(k["Jumlah (Rp)"] / (biaya || 1))]));
      // kehadiran
      judul("Kehadiran per lokasi");
      tabel([{ t: "Lokasi", w: 46 }, { t: "Pegawai", w: 14, r: 1 }, { t: "Hadir", w: 14, r: 1 }, { t: "Terjadwal", w: 17, r: 1 }, { t: "Kehadiran", w: 18, r: 1 }, { t: "Tanpa ket.", w: 17, r: 1 }, { t: "Telat", w: 12, r: 1 }, { t: "Pot. telat", w: 22, r: 1 }],
        cab.map((c) => [c.cabang, c.n, c.hadir, c.terjadwal, c.tanpaJadwal ? "order" : { t: pct(c.persen), c: c.persen < AMBANG_HADIR ? AMB : INK }, c.absen, c.telat, rpT(c.telatPot)]));
      // per pegawai
      baru();
      judul("Rincian gaji per pegawai");
      tabel([{ t: "No. slip", w: 22 }, { t: "Nama", w: 38 }, { t: "Lokasi", w: 34 }, { t: "Hadir", w: 13, r: 1 }, { t: "Telat", w: 11, r: 1 }, { t: "Bruto", w: 23, r: 1 }, { t: "Potongan", w: 21, r: 1 }, { t: "Diterima", w: 23, r: 1 }],
        L.pegawai.map((p) => [p["No. Slip"], p.Nama, p.Lokasi, `${p.Hadir}/${p.Terjadwal}`, p["Telat Dipotong"], rpT(p["Pendapatan Bruto"]), rpT(p.Potongan), p["Gaji Diterima"] === "" ? "tarif kosong" : rpT(p["Gaji Diterima"])])
          .concat([["", "Total", "", "", "", rpT(sumBy(rk, (r) => r.Pendapatan)), rpT(sumBy(rk, (r) => r.Potongan)), rpT(sumBy(rk, (r) => r.GajiBersih || 0))]]), { total: 1 });
      // tanda tangan
      if (y > BOTTOM - 40) baru();
      y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text("Disiapkan oleh,", 50, y, { align: "center" }); doc.text(cfg.kota + ", " + tglPanjang(new Date()), 160, y, { align: "center" });
      doc.text("Disetujui oleh,", 160, y + 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text("(........................)", 50, y + 30, { align: "center" }); doc.text(L.ap ? L.ap.oleh : (cfg.ttdNama || "(........................)"), 160, y + 30, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.text(cfg.ttdJabatan || "", 160, y + 35, { align: "center" });
      // nomor halaman
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(`Rahasia · hanya untuk manajemen · halaman ${i} dari ${n}`, X0, 290); doc.text(`Sumber: Kolabo ${hasil.dari} s/d ${hasil.sampai}`, X1, 290, { align: "right" }); }
      await saveFile("Laporan_Gaji_" + hasil.periode + ".pdf", doc.output("arraybuffer"), "application/pdf");
    } catch (e) { setSaved("Unduhan gagal: " + (e.message || e)); }
  }
