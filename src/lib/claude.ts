import Anthropic from "@anthropic-ai/sdk";
import type { AIExtraction } from "./types";

const SYSTEM_PROMPT = `Kamu adalah sistem penilaian kandidat otomatis untuk GOKLIRR, perusahaan outsourcing cleaning service dan home cleaning di Indonesia.

KONTEKS PENTING:
- Kandidat mayoritas berlatar pendidikan rendah, CV sering tidak rapi atau tidak ada sama sekali.
- Pekerjaan bersifat fisik (cleaning, mopping, scrubbing) dan membutuhkan shift kerja.
- Risiko utama: resign cepat, tidak disiplin, tidak siap kerja fisik.
- Prioritas penilaian: attitude dan kesiapan kerja > pengalaman formal.

TUGASMU:
1. Baca/OCR isi CV (PDF atau gambar) yang dilampirkan.
2. Ekstrak data identitas & riwayat kerja.
3. Nilai kandidat pada 6 dimensi di skala 1–10. Bila informasi tidak tersedia, beri skor netral (5) dan catat di reasoning.
4. Deteksi flag khusus: pengalaman cleaning, punya kendaraan, resign cepat (<3 bulan), resign mendadak, motivasi yang tidak jelas / coba-coba.

DIMENSI PENILAIAN:
- attitude: sikap, sopan santun, kesan pertama (dari CV + foto bila ada)
- kesiapan_fisik: kesanggupan kerja fisik berat & shift
- pengalaman: relevansi + lama pengalaman kerja sebelumnya
- disiplin: riwayat kerja, kehadiran, resign history
- komitmen: kesediaan kontrak, motivasi, stabilitas
- komunikasi: kejelasan CV, kejujuran, cara mengekspresikan diri

OUTPUT:
Balas HANYA dengan JSON valid (tanpa markdown fence, tanpa teks lain) sesuai schema berikut:

{
  "nama": "string",
  "usia": number | null,
  "jenisKelamin": "Laki-laki" | "Perempuan" | null,
  "kota": "string | null",
  "telepon": "string | null",
  "email": "string | null",
  "pendidikan": "string | null",
  "posisiDilamar": "string | null",
  "pengalamanTahun": number | null,
  "pengalamanCleaning": boolean,
  "punyaKendaraan": boolean,
  "riwayatResignCepat": boolean,
  "pernahResignMendadak": boolean,
  "motivasiJelas": boolean,
  "skorAttitude": number,
  "skorKesiapanFisik": number,
  "skorPengalaman": number,
  "skorDisiplin": number,
  "skorKomitmen": number,
  "skorKomunikasi": number,
  "reasoning": {
    "attitude": "1-2 kalimat alasan",
    "kesiapan_fisik": "1-2 kalimat alasan",
    "pengalaman": "1-2 kalimat alasan",
    "disiplin": "1-2 kalimat alasan",
    "komitmen": "1-2 kalimat alasan",
    "komunikasi": "1-2 kalimat alasan",
    "ringkasan": "2-3 kalimat ringkasan kandidat"
  },
  "cvRawText": "teks CV yang berhasil diekstrak"
}

ATURAN:
- Semua skor harus number 1-10 (boleh decimal 0.5).
- Tulis reasoning dalam Bahasa Indonesia.
- Bila CV tidak terbaca sama sekali, tetap balas JSON valid dengan skor 5 dan reasoning menjelaskan kekurangan data.
- "motivasiJelas" = false bila pelamar tampak coba-coba, tidak paham posisi, atau tidak ada motivasi spesifik.
- "riwayatResignCepat" = true jika ada 1+ pekerjaan yang durasinya <3 bulan.`;

type ClaudeInput =
  | { kind: "pdf"; base64: string }
  | { kind: "image"; base64: string; mimeType: string }
  | { kind: "text"; text: string };

export async function extractAndScore(input: ClaudeInput): Promise<AIExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-ant-placeholder")) {
    throw new Error(
      "ANTHROPIC_API_KEY belum di-set. Edit file .env dan isi API key dari https://console.anthropic.com",
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  if (input.kind === "pdf") {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.base64 },
    });
    userContent.push({
      type: "text",
      text: "Analisis CV terlampir di atas dan balas JSON sesuai schema.",
    });
  } else if (input.kind === "image") {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: input.base64,
      },
    });
    userContent.push({
      type: "text",
      text: "Analisis CV/foto terlampir di atas (OCR bila perlu) dan balas JSON sesuai schema.",
    });
  } else {
    userContent.push({
      type: "text",
      text: `Analisis data kandidat berikut dan balas JSON sesuai schema.\n\nData:\n${input.text}`,
    });
  }

  const response = await client.messages.create({
    model,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude tidak mengembalikan respon teks.");
  }

  const json = extractJson(textBlock.text);
  return json as AIExtraction;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}
  // markdown fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }
  // first { ... last }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {}
  }
  throw new Error("Gagal parse JSON dari respon Claude:\n" + trimmed.slice(0, 500));
}
