export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

function isLateCancellation(sessionDate: Date, sessionTime: string): boolean {
  const [h, m] = sessionTime.split(":").map(Number);
  const dt = new Date(sessionDate);
  dt.setHours(h, m, 0, 0);
  return new Date() > new Date(dt.getTime() - 5 * 60 * 60 * 1000);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { date, time } = await req.json();

  const existing = await db.memberReservation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Δεν βρέθηκε" }, { status: 404 });

  const dateChanged = date && new Date(date).toISOString() !== existing.date.toISOString();
  const timeChanged = time && time !== existing.time;

  if (dateChanged || timeChanged) {
    const late = isLateCancellation(existing.date, existing.time);
    await db.memberCancellation.create({
      data: {
        memberId: existing.memberId,
        sessionDate: existing.date,
        sessionTime: existing.time,
        isLate: late,
        wasRescheduled: true,
      },
    });
  }

  const updated = await db.memberReservation.update({
    where: { id },
    data: {
      ...(date ? { date: new Date(date), ...(dateChanged ? { movedFrom: existing.date } : {}) } : {}),
      ...(time ? { time } : {}),
    },
  });

  return NextResponse.json({ ...updated, date: updated.date.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.memberReservation.findUnique({ where: { id } });
  if (existing) {
    const late = isLateCancellation(existing.date, existing.time);
    await db.memberCancellation.create({
      data: {
        memberId: existing.memberId,
        sessionDate: existing.date,
        sessionTime: existing.time,
        isLate: late,
        wasRescheduled: false,
      },
    });
  }

  await db.memberReservation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
