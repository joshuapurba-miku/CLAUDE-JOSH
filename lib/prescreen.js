/**
 * Rule-based pre-screening engine.
 * Runs before the Claude API call to filter out clearly unqualified candidates,
 * saving 60-70% of API costs.
 *
 * Returns { score, passed, reasons } where score is 0-10.
 * Candidates with score < 6.0 are rejected without calling Claude.
 */

const PRESCREEN_THRESHOLD = 6.0;

// Keywords that suggest readiness
const SHIFT_READY = ['siap', 'bisa', 'iya', 'ya', 'sanggup', 'ok', 'okay'];
const PHYSICAL_READY = ['siap', 'kuat', 'biasa', 'terbiasa', 'sanggup', 'bisa', 'mampu'];
const VEHICLE_OWNED = ['motor', 'mobil', 'punya', 'ada', 'milik'];
const COMMIT_STRONG = ['siap', 'sanggup', 'pasti', 'mau', 'setuju', 'tanda tangan', 'ttd'];
const RESIGN_BAD = ['mendadak', 'kabur', 'tidak bilang', 'tanpa kabar', 'ilang', 'hilang'];
const RESIGN_REPEAT_BAD = ['sering', 'berkali', 'beberapa kali', '3 kali', '4 kali', '5 kali'];
const MOTIVATION_VAGUE = ['coba-coba', 'iseng', 'ga ada kerjaan', 'nganggur', 'tidak tahu', 'gak tau'];

function containsAny(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function scoreAge(usia) {
  if (usia < 18) return { points: 0, note: 'Usia di bawah minimum (18 tahun)' };
  if (usia < 20) return { points: 3, note: 'Usia terlalu muda (< 20 tahun)' };
  if (usia >= 25 && usia <= 40) return { points: 10, note: 'Usia ideal (25–40 tahun)' };
  if (usia >= 20 && usia < 25) return { points: 7, note: 'Usia cukup (20–24 tahun)' };
  if (usia > 40 && usia <= 50) return { points: 7, note: 'Usia 41–50 tahun' };
  return { points: 4, note: 'Usia di atas 50 tahun' };
}

function scoreExperience(pengalaman) {
  const lower = pengalaman.toLowerCase();

  // Extract years of experience heuristically
  const yearMatch = lower.match(/(\d+)\s*(tahun|thn|th)/);
  const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  const isCleaning = /cleaning|housekeep|hotel|bersih|mop|sapu|cuci|laundry|gedung/.test(lower);
  const isAnyWork = /kerja|bekerja|karyawan|pabrik|toko|warung|dagang/.test(lower);
  const isNone = /belum|tidak pernah|ga pernah|gak pernah|fresh|baru/.test(lower);

  if (isNone) return { points: 3, note: 'Belum ada pengalaman kerja' };
  if (isCleaning && years >= 3) return { points: 10, note: `Pengalaman cleaning ${years} tahun` };
  if (isCleaning && years >= 1) return { points: 8, note: `Pengalaman cleaning ${years} tahun` };
  if (isCleaning) return { points: 7, note: 'Pengalaman di bidang cleaning' };
  if (isAnyWork && years >= 2) return { points: 6, note: `Pengalaman kerja umum ${years} tahun` };
  if (isAnyWork) return { points: 5, note: 'Ada pengalaman kerja umum' };
  return { points: 4, note: 'Pengalaman tidak jelas' };
}

function scoreResignHistory(riwayat) {
  if (containsAny(riwayat, RESIGN_REPEAT_BAD)) return { points: 1, note: 'Riwayat resign berulang' };
  if (containsAny(riwayat, RESIGN_BAD)) return { points: 3, note: 'Pernah resign mendadak' };

  const lower = riwayat.toLowerCase();
  const isNormal = /kontrak|habis|selesai|normal|pindah kota|ikut suami|keluarga/.test(lower);
  const isNone = /belum pernah|tidak pernah|ga pernah|pertama/.test(lower);

  if (isNone) return { points: 9, note: 'Belum pernah resign' };
  if (isNormal) return { points: 8, note: 'Resign dengan alasan wajar' };
  return { points: 6, note: 'Riwayat resign tidak jelas' };
}

/**
 * @param {Object} data Candidate form data
 * @returns {{ score: number, passed: boolean, reasons: string[] }}
 */
export function prescreen(data) {
  const reasons = [];
  let total = 0;
  let weights = 0;

  // Age (weight 10)
  const age = scoreAge(Number(data.usia));
  total += age.points * 10;
  weights += 10 * 10;
  reasons.push(`Usia: ${age.note} (${age.points}/10)`);
  if (age.points === 0) return { score: 0, passed: false, reasons: ['Usia di bawah 18 tahun — ditolak otomatis'] };

  // Shift readiness (weight 15)
  const shiftReady = containsAny(data.siap_shift, SHIFT_READY);
  const shiftPoints = shiftReady ? 9 : 3;
  total += shiftPoints * 15;
  weights += 9 * 15;
  reasons.push(`Shift: ${shiftReady ? 'Siap' : 'Tidak siap / tidak jelas'} (${shiftPoints}/10)`);

  // Physical readiness (weight 15)
  const physReady = containsAny(data.siap_fisik, PHYSICAL_READY);
  const physPoints = physReady ? 9 : 3;
  total += physPoints * 15;
  weights += 9 * 15;
  reasons.push(`Fisik: ${physReady ? 'Siap kerja fisik' : 'Tidak siap / tidak jelas'} (${physPoints}/10)`);

  // Experience (weight 20)
  const exp = scoreExperience(data.pengalaman);
  total += exp.points * 20;
  weights += 10 * 20;
  reasons.push(`Pengalaman: ${exp.note} (${exp.points}/10)`);

  // Resign history (weight 20)
  const resign = scoreResignHistory(data.riwayat_resign);
  total += resign.points * 20;
  weights += 10 * 20;
  reasons.push(`Resign: ${resign.note} (${resign.points}/10)`);

  // Motivation clarity (weight 10)
  const vagueMotivation = containsAny(data.motivasi, MOTIVATION_VAGUE);
  const motivPoints = vagueMotivation ? 3 : 7;
  total += motivPoints * 10;
  weights += 10 * 10;
  reasons.push(`Motivasi: ${vagueMotivation ? 'Tidak jelas / coba-coba' : 'Cukup jelas'} (${motivPoints}/10)`);

  // Commitment (weight 10)
  const committed = containsAny(data.komitmen_kontrak, COMMIT_STRONG);
  const commitPoints = committed ? 9 : 4;
  total += commitPoints * 10;
  weights += 9 * 10;
  reasons.push(`Komitmen: ${committed ? 'Kuat' : 'Lemah / tidak jelas'} (${commitPoints}/10)`);

  const score = Math.round((total / weights) * 10 * 10) / 10;
  const passed = score >= PRESCREEN_THRESHOLD;

  return { score, passed, reasons };
}
