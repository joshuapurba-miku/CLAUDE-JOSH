import { prisma } from "@/lib/db";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  if (/[",\n]/.test(s)) return `"${s}"`;
  return s;
}

export async function GET() {
  const rows = await prisma.candidate.findMany({ orderBy: { createdAt: "desc" } });
  const headers = [
    "id",
    "createdAt",
    "nama",
    "usia",
    "jenisKelamin",
    "kota",
    "telepon",
    "email",
    "pendidikan",
    "posisiDilamar",
    "pengalamanTahun",
    "pengalamanCleaning",
    "punyaKendaraan",
    "riwayatResignCepat",
    "pernahResignMendadak",
    "motivasiJelas",
    "skorAttitude",
    "skorKesiapanFisik",
    "skorPengalaman",
    "skorDisiplin",
    "skorKomitmen",
    "skorKomunikasi",
    "bonus",
    "penalti",
    "skorAkhir",
    "rekomendasi",
    "status",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape((r as unknown as Record<string, unknown>)[h])).join(","));
  }
  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goklirr-candidates-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
