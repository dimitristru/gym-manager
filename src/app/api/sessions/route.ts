import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId, startsAt } = await req.json();
  if (!classId || !startsAt) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const gymClass = await db.gymClass.findUnique({ where: { id: classId } });
  if (!gymClass) return NextResponse.json({ error: "Μάθημα δεν βρέθηκε" }, { status: 404 });

  const start = new Date(startsAt);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + gymClass.durationMin);

  const schedule = await db.classSchedule.create({
    data: { classId, startsAt: start, endsAt: end },
  });

  return NextResponse.json(schedule, { status: 201 });
}
