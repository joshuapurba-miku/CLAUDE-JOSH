import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PIPELINE_STATUSES } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };
  if (!status || !PIPELINE_STATUSES.includes(status as (typeof PIPELINE_STATUSES)[number])) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });
  if (existing.status === status) return NextResponse.json({ ok: true, candidate: existing });

  const updated = await prisma.candidate.update({
    where: { id },
    data: {
      status,
      statusUpdatedAt: new Date(),
      timeline: {
        create: {
          eventType: "status_change",
          fromStatus: existing.status,
          toStatus: status,
          description: `Status berubah: ${existing.status} → ${status}`,
        },
      },
    },
  });
  return NextResponse.json({ ok: true, candidate: updated });
}
