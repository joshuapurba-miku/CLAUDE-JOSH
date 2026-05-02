import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractAndScore } from "@/lib/claude";
import { computeScore } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const manualText = (form.get("manualText") as string | null) || null;

    if ((!files || files.length === 0) && !manualText) {
      return NextResponse.json({ error: "Tidak ada file atau teks yang diberikan." }, { status: 400 });
    }

    const results: { id: string; nama: string; skorAkhir: number; rekomendasi: string }[] = [];
    const errors: { fileName: string; error: string }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const ab = await file.arrayBuffer();
          const base64 = Buffer.from(ab).toString("base64");
          const mime = file.type || "application/octet-stream";

          const input =
            mime === "application/pdf"
              ? { kind: "pdf" as const, base64 }
              : mime.startsWith("image/")
              ? { kind: "image" as const, base64, mimeType: mime }
              : null;

          if (!input) {
            errors.push({ fileName: file.name, error: `Tipe file tidak didukung: ${mime}` });
            continue;
          }

          const extraction = await extractAndScore(input);
          const score = computeScore(extraction);

          const created = await prisma.candidate.create({
            data: {
              nama: extraction.nama || "Tanpa Nama",
              usia: extraction.usia ?? null,
              jenisKelamin: extraction.jenisKelamin ?? null,
              kota: extraction.kota ?? null,
              telepon: extraction.telepon ?? null,
              email: extraction.email ?? null,
              pendidikan: extraction.pendidikan ?? null,
              posisiDilamar: extraction.posisiDilamar ?? null,
              pengalamanTahun: extraction.pengalamanTahun ?? null,
              pengalamanCleaning: !!extraction.pengalamanCleaning,
              punyaKendaraan: !!extraction.punyaKendaraan,
              riwayatResignCepat: !!extraction.riwayatResignCepat,
              pernahResignMendadak: !!extraction.pernahResignMendadak,
              motivasiJelas: extraction.motivasiJelas ?? true,
              skorAttitude: extraction.skorAttitude,
              skorKesiapanFisik: extraction.skorKesiapanFisik,
              skorPengalaman: extraction.skorPengalaman,
              skorDisiplin: extraction.skorDisiplin,
              skorKomitmen: extraction.skorKomitmen,
              skorKomunikasi: extraction.skorKomunikasi,
              skorAkhir: score.skorAkhir,
              bonus: score.bonus,
              penalti: score.penalti,
              rekomendasi: score.rekomendasi,
              reasoning: JSON.stringify({ ...extraction.reasoning, breakdown: score.breakdown }),
              cvFileName: file.name,
              cvMimeType: mime,
              cvRawText: extraction.cvRawText ?? null,
              timeline: {
                create: [
                  {
                    eventType: "uploaded",
                    description: `CV diunggah: ${file.name}`,
                  },
                  {
                    eventType: "scored",
                    description: `Di-score otomatis: ${score.skorAkhir} → ${score.rekomendasi}`,
                  },
                ],
              },
            },
          });

          results.push({
            id: created.id,
            nama: created.nama,
            skorAkhir: created.skorAkhir,
            rekomendasi: created.rekomendasi,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push({ fileName: file.name, error: msg });
        }
      }
    }

    if (manualText) {
      try {
        const extraction = await extractAndScore({ kind: "text", text: manualText });
        const score = computeScore(extraction);
        const created = await prisma.candidate.create({
          data: {
            nama: extraction.nama || "Tanpa Nama",
            usia: extraction.usia ?? null,
            jenisKelamin: extraction.jenisKelamin ?? null,
            kota: extraction.kota ?? null,
            telepon: extraction.telepon ?? null,
            email: extraction.email ?? null,
            pendidikan: extraction.pendidikan ?? null,
            posisiDilamar: extraction.posisiDilamar ?? null,
            pengalamanTahun: extraction.pengalamanTahun ?? null,
            pengalamanCleaning: !!extraction.pengalamanCleaning,
            punyaKendaraan: !!extraction.punyaKendaraan,
            riwayatResignCepat: !!extraction.riwayatResignCepat,
            pernahResignMendadak: !!extraction.pernahResignMendadak,
            motivasiJelas: extraction.motivasiJelas ?? true,
            skorAttitude: extraction.skorAttitude,
            skorKesiapanFisik: extraction.skorKesiapanFisik,
            skorPengalaman: extraction.skorPengalaman,
            skorDisiplin: extraction.skorDisiplin,
            skorKomitmen: extraction.skorKomitmen,
            skorKomunikasi: extraction.skorKomunikasi,
            skorAkhir: score.skorAkhir,
            bonus: score.bonus,
            penalti: score.penalti,
            rekomendasi: score.rekomendasi,
            reasoning: JSON.stringify({ ...extraction.reasoning, breakdown: score.breakdown }),
            cvFileName: null,
            cvMimeType: "text/plain",
            cvRawText: extraction.cvRawText ?? manualText,
            timeline: {
              create: [
                { eventType: "uploaded", description: "Input manual dari form" },
                {
                  eventType: "scored",
                  description: `Di-score otomatis: ${score.skorAkhir} → ${score.rekomendasi}`,
                },
              ],
            },
          },
        });
        results.push({
          id: created.id,
          nama: created.nama,
          skorAkhir: created.skorAkhir,
          rekomendasi: created.rekomendasi,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ fileName: "manual-input", error: msg });
      }
    }

    return NextResponse.json({ results, errors });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
