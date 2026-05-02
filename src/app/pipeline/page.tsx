import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const cards = await prisma.candidate.findMany({
    orderBy: { skorAkhir: "desc" },
    select: {
      id: true,
      nama: true,
      kota: true,
      skorAkhir: true,
      rekomendasi: true,
      status: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Rekrutmen</h1>
        <p className="text-sm text-slate-600 mt-1">
          Drag & drop kandidat antar kolom untuk meng-update status. Perubahan otomatis tercatat di
          timeline.
        </p>
      </div>
      <KanbanBoard cards={cards} />
    </div>
  );
}
