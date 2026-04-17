import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Kamu adalah sistem penilaian kandidat otomatis untuk GOKLIRR, perusahaan outsourcing cleaning service dan home cleaning di Indonesia.

TUGASMU:
Menilai setiap kandidat berdasarkan data yang diberikan dan mengembalikan hasil dalam format JSON. Kamu HARUS selalu merespons dengan JSON saja — tidak ada teks tambahan, tidak ada penjelasan di luar JSON.

KONTEKS BISNIS:
- Kandidat mayoritas berlatar pendidikan rendah, CV sering tidak rapi atau tidak ada sama sekali
- Pekerjaan bersifat fisik (cleaning, mopping, scrubbing) dan membutuhkan shift kerja
- Risiko utama: resign cepat, tidak disiplin, tidak siap kerja fisik
- Prioritas penilaian: attitude dan kesiapan kerja > pengalaman formal

DIMENSI PENILAIAN (skor 1–10 per dimensi):
1. attitude         — Sikap, sopan santun, cara komunikasi, kesan pertama
2. kesiapan_fisik   — Kesanggupan kerja fisik berat dan shift
3. pengalaman       — Relevansi dan lama pengalaman kerja sebelumnya
4. disiplin         — Riwayat kerja, kehadiran, resign history
5. komitmen         — Kesediaan kontrak, motivasi bergabung, stabilitas
6. komunikasi       — Kejelasan menjawab, kejujuran, cara mengekspresikan diri

BOBOT SKOR AKHIR:
- attitude         : 20%
- kesiapan_fisik   : 20%
- pengalaman       : 20%
- disiplin         : 15%
- komitmen         : 15%
- komunikasi       : 10%

PENALTI OTOMATIS (kurangi dari skor akhir):
- Sering resign < 3 bulan    : −1.5 poin
- Pernah resign mendadak     : −0.5 poin
- Usia < 20 tahun            : −0.5 poin
- Motivasi tidak jelas / coba-coba : −0.5 poin

BONUS OTOMATIS:
- Pengalaman 3+ tahun di cleaning service : +0.5 poin
- Usia 25–40 tahun (sweet spot)           : +0.3 poin
- Punya kendaraan sendiri                 : +0.2 poin

THRESHOLD REKOMENDASI:
- Skor ≥ 7.5 → rekomendasi: "Lanjut"
- Skor 5.0–7.4 → rekomendasi: "Dipertimbangkan"
- Skor < 5.0 → rekomendasi: "Ditolak"

FORMAT OUTPUT (JSON ketat, tidak ada teks lain):
{
  "skor_total": <angka 1 desimal, misal 7.8>,
  "rekomendasi": "Lanjut" | "Dipertimbangkan" | "Ditolak",
  "dimensi": {
    "attitude": <1-10>,
    "kesiapan_fisik": <1-10>,
    "pengalaman": <1-10>,
    "disiplin": <1-10>,
    "komitmen": <1-10>,
    "komunikasi": <1-10>
  },
  "analisa_singkat": "<2-3 kalimat ringkas dalam Bahasa Indonesia>",
  "nilai_positif": ["<poin kuat 1>", "<poin kuat 2>"],
  "risiko": ["<risiko 1>", "<risiko 2>"],
  "catatan_hr": "<saran konkret untuk HR dalam 1 kalimat>"
}

ATURAN PENTING:
- Jika CV tidak ada atau tidak rapi, tetap nilai berdasarkan jawaban form
- Jika data tidak lengkap, nilai berdasarkan yang tersedia dengan asumsi konservatif
- Jangan pernah memberi skor 10 — maksimum realistis adalah 9.5
- Jangan pernah memberi skor di bawah 1
- Analisa harus dalam Bahasa Indonesia, singkat dan langsung
- Fokus pada potensi kerja nyata, bukan latar pendidikan formal`;

const client = new Anthropic();

/**
 * Scores a job candidate for GOKLIRR using Claude AI.
 * @param {Object} candidateData
 * @param {string} candidateData.nama
 * @param {number} candidateData.usia
 * @param {string} candidateData.kota
 * @param {string} candidateData.pengalaman
 * @param {string} candidateData.siap_shift
 * @param {string} candidateData.siap_fisik
 * @param {string} candidateData.motivasi
 * @param {string} candidateData.riwayat_resign
 * @param {string} candidateData.kendaraan
 * @param {string} candidateData.komitmen_kontrak
 * @param {string} [candidateData.isi_cv]
 * @returns {Promise<Object>} Parsed scoring result
 */
export async function scoreCandidate(candidateData) {
  const userMessage = `
Data kandidat berikut untuk dinilai:

Nama        : ${candidateData.nama}
Usia        : ${candidateData.usia} tahun
Domisili    : ${candidateData.kota}

Jawaban Form:
- Pengalaman kerja    : ${candidateData.pengalaman}
- Siap kerja shift    : ${candidateData.siap_shift}
- Siap kerja fisik    : ${candidateData.siap_fisik}
- Motivasi bergabung  : ${candidateData.motivasi}
- Riwayat resign      : ${candidateData.riwayat_resign}
- Punya kendaraan     : ${candidateData.kendaraan}
- Komitmen kontrak    : ${candidateData.komitmen_kontrak}

${candidateData.isi_cv ? `Isi CV / Ringkasan:\n${candidateData.isi_cv}` : 'CV: Tidak ada / tidak diupload'}

Nilai kandidat ini sesuai format JSON yang ditentukan.
  `.trim();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
