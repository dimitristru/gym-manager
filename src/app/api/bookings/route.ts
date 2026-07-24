import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduleId, memberId } = await req.json();
  if (!scheduleId || !memberId) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const schedule = await db.classSchedule.findUnique({
    where: { id: scheduleId },
    include: { class: true, bookings: { where: { cancelled: false } } },
  });

  if (!schedule) return NextResponse.json({ error: "Session δεν βρέθηκε" }, { status: 404 });
  if (schedule.isCancelled) return NextResponse.json({ error: "Το μάθημα έχει ακυρωθεί" }, { status: 400 });
  if (schedule.bookings.length >= schedule.class.capacity) {
    return NextResponse.json({ error: "Δεν υπάρχουν διαθέσιμες θέσεις" }, { status: 400 });
  }

  const existing = await db.classBooking.findUnique({
    where: { memberId_scheduleId: { memberId, scheduleId } },
  });

  if (existing && !existing.cancelled) {
    return NextResponse.json({ error: "Το μέλος έχει ήδη κράτηση" }, { status: 400 });
  }

  const booking = existing
    ? await db.classBooking.update({ where: { id: existing.id }, data: { cancelled: false } })
    : await db.classBooking.create({ data: { memberId, scheduleId } });

  return NextResponse.json(booking, { status: 201 });
}
