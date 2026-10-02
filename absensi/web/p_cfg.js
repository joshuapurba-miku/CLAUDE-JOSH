
<script>
(function () {
  "use strict";

  // ---------- konfigurasi bawaan ----------
  const SEED_TARIF = [
    ["Tim Lapangan DAFI SCHOOL", "PIC"], ["Tim Lapangan DAFI SCHOOL", "CSO"],
    ["Tim Lapangan FIT INFINITY", "PIC"], ["Tim Lapangan FIT INFINITY", "CSO"],
    ["Tim Lapangan RSMH", "PIC"], ["Tim Lapangan RSMH", "CSO"],
    ["Tim Lapangan Play Padel", "CSO"],
    ["Tim Lapangan Gotong-Gotong", "PIC"], ["Tim Lapangan Gotong-Gotong", "CSO"],
    ["Tim Lapangan Cv Bintang Harapan", "MANPOWER"],
    ["Home Cleaning", "CSO"],
    ["HEAD OFFICE INTERNAL", "CS & Admin Operasional"], ["HEAD OFFICE INTERNAL", "Finance"],
    ["HEAD OFFICE INTERNAL", "HUMAN RESOURCE DEPARTMENT"], ["HEAD OFFICE INTERNAL", "Legal & Compliance"],
    ["HEAD OFFICE INTERNAL", "CONTENT CREATOR INT"]
  ];
  const TARIF_KOSONG = { gaji: 0, tunjMT: 0, tunjKin: 0, tunjAbs: 0, admin: 30000 };
  function defaultCfg() {
    return {
      shifts: [
        { nama: "Pagi 06-14", masuk: "06:00", pulang: "14:00", cabang: "", hari: "" },
        { nama: "Pagi 07-15", masuk: "07:00", pulang: "15:00", cabang: "", hari: "" },
        { nama: "Kantor 08:30-17:30", masuk: "08:30", pulang: "17:30", cabang: "HEAD OFFICE INTERNAL, Home Cleaning", hari: "" },
        { nama: "Lapangan 09-16", masuk: "09:00", pulang: "16:00", cabang: "Tim Lapangan Gotong-Gotong", hari: "" },
        { nama: "Lapangan 09-18", masuk: "09:00", pulang: "18:00", cabang: "Tim Lapangan Cv Bintang Harapan", hari: "" },
        { nama: "Siang 10-18", masuk: "10:00", pulang: "18:00", cabang: "", hari: "" },
        { nama: "Siang 14-22", masuk: "14:00", pulang: "22:00", cabang: "", hari: "" },
        { nama: "Sore 15-23", masuk: "15:00", pulang: "23:00", cabang: "", hari: "" },
        { nama: "Sabtu DAFI 06-11", masuk: "06:00", pulang: "11:00", cabang: "Tim Lapangan DAFI SCHOOL", hari: "Sabtu" },
        { nama: "Sabtu DAFI 10-15", masuk: "10:00", pulang: "15:00", cabang: "Tim Lapangan DAFI SCHOOL", hari: "Sabtu" }
      ],
      alias: "08:30-22:00 = Kantor 08:30-17:30\n15:00-11:00 = Sore 15-23",
      tetap: "HEAD OFFICE INTERNAL\nHome Cleaning",
      tolTelat: 0, tolPulang: 10, gantiShift: 90, reviewBiaya: 120, minKerja: 120,
      lemburMin: 60, lemburBulat: 30, tarifLembur: 0,
      pembagi: 26, telatAmbang: 10, telatNominal: 20000, pulangPerMenit: 0, bonusDouble: 0,
      dasarHarian: { gaji: true, tunjMT: true, tunjKin: false, tunjAbs: false },
      tarif: SEED_TARIF.map(([c, p]) => Object.assign({ cabang: c, posisi: p }, TARIF_KOSONG)),
      lembur: [], adj: {}, pegawai: {}, bulanan: {},
      perusahaan: "", alamat: "", kota: "Makassar", ttdNama: "Joshua L.H Purba", ttdJabatan: "Direktur Operasional",
      judulSlip: "Financial Detail Report",
      tanpaJadwal: "Home Cleaning", metodeGaji: "potong",
      hcTarif: [
        { min: 1, max: 2, bagi: 20000, makan: 10000, trans: 5000 },
        { min: 3, max: 4, bagi: 20000, makan: 15000, trans: 10000 },
        { min: 5, max: 6, bagi: 25000, makan: 15000, trans: 10000 },
        { min: 7, max: 8, bagi: 30000, makan: 15000, trans: 15000 },
        { min: 9, max: 24, bagi: 35000, makan: 20000, trans: 15000 }
      ],
      invoice: {}, riwayat: {}, approval: {},
      logo: "", logoW: 0, logoH: 0, slipPassword: "none"
    };
  }

  // ---------- state ----------
  let cfg = defaultCfg();
  let hasil = null, rawRows = null, fileName = "", perusahaanFile = "";
  let dbApi = null, saveTimer = null;
  let currentTab = "dash";
