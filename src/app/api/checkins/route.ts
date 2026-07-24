export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId, date, time } = await req.json();
  if (!memberId || !date || !time) {
    return NextResponse.json({ error: "Λείπουν πεδία" }, { status: 400 });
  }

  const checkIn = await db.checkIn.create({
    data: { memberId, date: new Date(date), time },
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json({
    id: checkIn.id,
    memberId: checkIn.memberId,
    memberName: checkIn.member.user.name,
    date: checkIn.date.toISOString(),
    time: checkIn.time,
    checkedAt: checkIn.checkedAt.toISOString(),
  }, { status: 201 });
}
