import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId, date, time, note } = await req.json();
  if (!memberId || !date || !time) {
    return NextResponse.json({ error: "Λείπουν πεδία" }, { status: 400 });
  }

  const reservation = await db.memberReservation.create({
    data: { memberId, date: new Date(date), time, note: note || null },
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json({
    id: reservation.id,
    memberId: reservation.memberId,
    memberName: reservation.member.user.name,
    date: reservation.date.toISOString(),
    time: reservation.time,
  }, { status: 201 });
}
