import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { body: note, author } = body as { body?: string; author?: string };
  if (!note || !note.trim()) {
    return NextResponse.json({ error: "Catatan kosong." }, { status: 400 });
  }
  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });

  const created = await prisma.note.create({
    data: {
      candidateId: id,
      author: author?.trim() || "HR",
      body: note.trim(),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      candidateId: id,
      eventType: "note_added",
      description: `Catatan ditambahkan oleh ${created.author}`,
    },
  });

  return NextResponse.json({ ok: true, note: created });
}
