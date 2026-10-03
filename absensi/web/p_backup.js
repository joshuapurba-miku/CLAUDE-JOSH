
  // ---------- tab Backup & Tambahan ----------
  function opsiPegawai(sel, termasukLuar) {
    const kol = hasil.rekap.filter((r) => !r.Luar).sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama));
    const grupCab = [...new Set(kol.map((r) => r.Cabang))];
    let h = `<option value="">— pilih —</option>`;
    if (termasukLuar) {
      const luar = (cfg.pegawaiLuar || []).filter((p) => p.aktif !== false && p.nama && !p.mulai && !p.selesai);
      if (luar.length) h += `<optgroup label="Di luar Kolabo">${luar.map((p) => `<option value="LUAR:${esc(p.id)}"${sel === "LUAR:" + p.id ? " selected" : ""}>${esc(p.nama)}${p.cabang ? " · " + esc(p.cabang) : ""}</option>`).join("")}</optgroup>`;
    }
    grupCab.forEach((c) => { h += `<optgroup label="${esc(c)}">${kol.filter((r) => r.Cabang === c).map((r) => `<option value="${esc(r.key)}"${sel === r.key ? " selected" : ""}>${esc(r.Nama)}</option>`).join("")}</optgroup>`; });
    return h;
  }
  function renderBackup() {
    const el = $("#tab-bk");
    if (!hasil) { el.innerHTML = kosong("Jadwal backup dihubungkan dengan data absensi. Upload export Kolabo dulu."); bindUpload(el); return; }
    const p = hasil.periode, list = cfg.backup[p] || [], bk = hasil.backup || [];
    const dari = hasil.dari, sampai = hasil.sampai;
    const nOk = bk.filter((o) => o.sev === "ok").length, nPer = bk.filter((o) => o.sev === "perhatian").length, nKon = bk.filter((o) => o.sev === "konflik").length;
    const pill = { ok: '<span class="pill ok">aman</span>', perhatian: '<span class="pill warn">perlu dicek</span>', konflik: '<span class="pill bad">bermasalah</span>' };
    let h = lockBanner() + `<div class="stack"><div class="panel stack"><div><h2>Jadwal backup ${bulanLabel(p)}</h2>
      <p class="sub">Catat siapa backup, di lokasi mana, tanggal berapa. Upah otomatis = gaji harian lokasi tempat backup (tarif lokasi ÷ ${cfg.pembagi}), masuk ke gaji pengganti sebagai "Backup [lokasi]". Kolom "Menggantikan" boleh kosong jika hanya mengisi kekurangan orang di lokasi itu. Pengganti muncul di Rekap Absensi lokasi tempat dia backup (kotak B).</p></div>
      <div class="row sub"><span><b>${list.length}</b> backup</span><span><b>${rp(sumBy(bk.filter((o) => o.sev !== "konflik"), (o) => o.upahPakai))}</b> total upah backup</span>${nPer ? `<span class="pill warn">${nPer} perlu dicek</span>` : ""}${nKon ? `<span class="pill bad">${nKon} bermasalah (tidak dibayar)</span>` : ""}</div>
      <div class="scroll"><table><thead><tr><th>Tanggal</th><th>Pengganti (yang dibayar)</th><th>Lokasi backup</th><th>Menggantikan (opsional)</th><th>Status yang digantikan</th><th class="n">Upah (Rp)</th><th>Keterangan</th><th>Cek</th><th></th></tr></thead><tbody>
      ${list.length ? "" : '<tr><td colspan="9" class="empty">Belum ada backup bulan ini.</td></tr>'}
      ${list.map((x, i) => { const o = bk[i] || {}; return `<tr>
        <td><input type="date" data-bk="${i}" data-f="tgl" value="${esc(x.tgl || "")}" min="${dari}" max="${sampai}" aria-label="Tanggal backup"></td>
        <td><select data-bk="${i}" data-f="pengganti" aria-label="Pengganti" style="min-width:200px">${opsiPegawai(x.pengganti, true)}</select></td>
        <td><select data-bk="${i}" data-f="lokasi" aria-label="Lokasi backup" style="min-width:170px"><option value="">${x.diganti && o.cabang ? "otomatis: " + esc(o.cabang) : "— pilih —"}</option>${branchList().map((c) => `<option value="${esc(c)}"${x.lokasi === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></td>
        <td><select data-bk="${i}" data-f="diganti" aria-label="Yang digantikan" style="min-width:200px">${opsiPegawai(x.diganti, false)}</select></td>
        <td>${esc(o.statusDiganti || "—")}</td>
        <td class="n"><input type="number" data-bk="${i}" data-f="upah" value="${isNum(x.upah) ? x.upah : ""}" min="0" step="1000" placeholder="${Math.round(o.harian || 0)}" style="width:120px;text-align:right" aria-label="Upah backup"></td>
        <td><input type="text" data-bk="${i}" data-f="ket" value="${esc(x.ket || "")}" placeholder="misal: shift pagi" aria-label="Keterangan"></td>
        <td class="wrap">${pill[o.sev] || ""}<div class="hint">${esc(o.alasan || "")}</div></td>
        <td><button class="btn ghost small" data-bkdel="${i}">Hapus</button></td></tr>`; }).join("")}
      </tbody></table></div><div><button class="btn ghost" id="bk-add">Tambah backup</button></div></div>`;
    // ringkasan per pengganti
    const per = hasil.rekap.filter((r) => r.BackupN);
    if (per.length) h += `<div class="panel"><h3>Ringkasan per pengganti</h3><div class="scroll" style="margin-top:8px"><table><thead><tr><th>Pengganti</th><th>Lokasi asal</th><th class="n">Hari backup</th><th class="n">Upah backup</th><th>Rincian</th></tr></thead><tbody>${per.map((r) => `<tr><td>${esc(r.Nama)}${r.Luar ? ' <span class="pill">luar Kolabo</span>' : ""}</td><td>${esc(r.Cabang)}</td><td class="n">${r.BackupN}</td><td class="n">${rp(r.BackupUpah)}</td><td class="wrap">${esc(r.BackupList.map((o) => `${tglPendek(o.tgl)} ${o.cabang}${o.namaDiganti ? " (" + o.namaDiganti + ")" : ""}`).join(", "))}</td></tr>`).join("")}</tbody></table></div></div>`;
    // pegawai di luar Kolabo
    const luar = cfg.pegawaiLuar || [];
    h += `<div class="panel stack"><div><h2>Pegawai tambahan (tidak ada / sudah dihapus di Kolabo)</h2><p class="sub">Contoh: pegawai yang masuk beberapa hari lalu resign dan akunnya dihapus di Kolabo, tenaga backup, tim home cleaning, atau freelance. <b>Isi tanggal mulai/selesai kerja</b> agar namanya muncul di Rekap Absensi harian lokasinya (otomatis hadir di rentang itu; klik kotaknya untuk mengubah jadi off/izin/dll) dan gajinya dihitung prorata dari tarif lokasi. Kosongkan tanggal untuk tenaga tanpa absensi harian.</p></div>
      ${dl("dl-cab", branchList())}${dl("dl-pos", postList().concat(["Backup", "Home Cleaning", "Freelance", "Project"]))}
      <div class="scroll"><table><thead><tr><th>Nama</th><th>NIP / ID</th><th>Lokasi</th><th>Posisi</th><th>Mulai kerja</th><th>Selesai kerja</th><th>Aktif</th><th></th></tr></thead><tbody>
      ${luar.length ? "" : '<tr><td colspan="8" class="empty">Belum ada.</td></tr>'}
      ${luar.map((x, i) => `<tr><td><input type="text" class="wide" data-lr="${i}" data-f="nama" value="${esc(x.nama || "")}" aria-label="Nama"></td><td><input type="text" data-lr="${i}" data-f="nip" value="${esc(x.nip || "")}" aria-label="NIP"></td>
        <td><input type="text" class="wide xl" list="dl-cab" data-lr="${i}" data-f="cabang" value="${esc(x.cabang || "")}" aria-label="Lokasi"></td><td><input type="text" class="wide" list="dl-pos" data-lr="${i}" data-f="posisi" value="${esc(x.posisi || "")}" aria-label="Posisi"></td>
        <td><input type="date" data-lr="${i}" data-f="mulai" value="${esc(x.mulai || "")}" aria-label="Mulai kerja"></td><td><input type="date" data-lr="${i}" data-f="selesai" value="${esc(x.selesai || "")}" aria-label="Selesai kerja"></td>
        <td><input type="checkbox" data-lr="${i}" data-f="aktif"${x.aktif !== false ? " checked" : ""} aria-label="Aktif"></td><td><button class="btn ghost small" data-lrdel="${i}">Hapus</button></td></tr>`).join("")}
      </tbody></table></div><div><button class="btn ghost" id="lr-add">Tambah pegawai</button></div></div></div>`;
    el.innerHTML = h;
    const ubah = () => { scheduleSave(); recompute(); };
    el.querySelectorAll("[data-bk]").forEach((inp) => inp.addEventListener("change", () => {
      const x = cfg.backup[p][+inp.dataset.bk], f = inp.dataset.f;
      if (f === "upah") { if (inp.value === "") delete x.upah; else x.upah = +inp.value; } else x[f] = inp.value;
      ubah();
    }));
    el.querySelectorAll("[data-bkdel]").forEach((b) => b.onclick = () => { cfg.backup[p].splice(+b.dataset.bkdel, 1); ubah(); });
    $("#bk-add").onclick = () => { (cfg.backup[p] = cfg.backup[p] || []).push({ tgl: "", pengganti: "", diganti: "", ket: "" }); ubah(); };
    el.querySelectorAll("[data-lr]").forEach((inp) => inp.addEventListener("change", () => {
      const x = cfg.pegawaiLuar[+inp.dataset.lr];
      x[inp.dataset.f] = inp.type === "checkbox" ? inp.checked : inp.value.trim();
      ubah();
    }));
    el.querySelectorAll("[data-lrdel]").forEach((b) => b.onclick = () => {
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Klik lagi"; return; }
      cfg.pegawaiLuar.splice(+b.dataset.lrdel, 1); ubah();
    });
    $("#lr-add").onclick = () => { cfg.pegawaiLuar.push({ id: Date.now().toString(36), nama: "", nip: "", cabang: "", posisi: "Backup", aktif: true }); scheduleSave(); renderBackup(); };
    kunciForm(el);
  }
