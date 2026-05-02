import type { AIExtraction, Rekomendasi, ScoringResult } from "./types";

const WEIGHTS = {
  attitude: 0.2,
  kesiapan_fisik: 0.2,
  pengalaman: 0.2,
  disiplin: 0.15,
  komitmen: 0.15,
  komunikasi: 0.1,
} as const;

export function clampScore(n: unknown, fallback = 5): number {
  const v = Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.max(1, Math.min(10, v));
}

export function computeScore(data: AIExtraction): ScoringResult {
  const weighted =
    clampScore(data.skorAttitude) * WEIGHTS.attitude +
    clampScore(data.skorKesiapanFisik) * WEIGHTS.kesiapan_fisik +
    clampScore(data.skorPengalaman) * WEIGHTS.pengalaman +
    clampScore(data.skorDisiplin) * WEIGHTS.disiplin +
    clampScore(data.skorKomitmen) * WEIGHTS.komitmen +
    clampScore(data.skorKomunikasi) * WEIGHTS.komunikasi;

  let bonus = 0;
  const bonusDetail: string[] = [];
  if (data.pengalamanCleaning && (data.pengalamanTahun ?? 0) >= 3) {
    bonus += 0.5;
    bonusDetail.push("+0.5 pengalaman 3+ tahun di cleaning service");
  }
  if (data.usia != null && data.usia >= 25 && data.usia <= 40) {
    bonus += 0.3;
    bonusDetail.push("+0.3 usia di sweet spot 25–40");
  }
  if (data.punyaKendaraan) {
    bonus += 0.2;
    bonusDetail.push("+0.2 punya kendaraan sendiri");
  }

  let penalti = 0;
  const penaltiDetail: string[] = [];
  if (data.riwayatResignCepat) {
    penalti += 1.5;
    penaltiDetail.push("-1.5 sering resign <3 bulan");
  }
  if (data.pernahResignMendadak) {
    penalti += 0.5;
    penaltiDetail.push("-0.5 pernah resign mendadak");
  }
  if (data.usia != null && data.usia < 20) {
    penalti += 0.5;
    penaltiDetail.push("-0.5 usia <20 tahun");
  }
  if (!data.motivasiJelas) {
    penalti += 0.5;
    penaltiDetail.push("-0.5 motivasi tidak jelas / coba-coba");
  }

  const skorAkhir = Math.max(0, Math.min(10, weighted + bonus - penalti));

  let rekomendasi: Rekomendasi;
  if (skorAkhir >= 7.5) rekomendasi = "Lanjut";
  else if (skorAkhir >= 5.0) rekomendasi = "Dipertimbangkan";
  else rekomendasi = "Ditolak";

  return {
    skorAkhir: Math.round(skorAkhir * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    penalti: Math.round(penalti * 100) / 100,
    rekomendasi,
    breakdown: {
      weighted: Math.round(weighted * 100) / 100,
      bonusDetail,
      penaltiDetail,
    },
  };
}
