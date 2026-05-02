export const PIPELINE_STATUSES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const REKOMENDASI = ["Lanjut", "Dipertimbangkan", "Ditolak"] as const;
export type Rekomendasi = (typeof REKOMENDASI)[number];

export interface AIExtraction {
  nama: string;
  usia: number | null;
  jenisKelamin: string | null;
  kota: string | null;
  telepon: string | null;
  email: string | null;
  pendidikan: string | null;
  posisiDilamar: string | null;
  pengalamanTahun: number | null;
  pengalamanCleaning: boolean;
  punyaKendaraan: boolean;
  riwayatResignCepat: boolean;
  pernahResignMendadak: boolean;
  motivasiJelas: boolean;

  skorAttitude: number;
  skorKesiapanFisik: number;
  skorPengalaman: number;
  skorDisiplin: number;
  skorKomitmen: number;
  skorKomunikasi: number;

  reasoning: {
    attitude: string;
    kesiapan_fisik: string;
    pengalaman: string;
    disiplin: string;
    komitmen: string;
    komunikasi: string;
    ringkasan: string;
  };

  cvRawText: string;
}

export interface ScoringResult {
  skorAkhir: number;
  bonus: number;
  penalti: number;
  rekomendasi: Rekomendasi;
  breakdown: {
    weighted: number;
    bonusDetail: string[];
    penaltiDetail: string[];
  };
}
