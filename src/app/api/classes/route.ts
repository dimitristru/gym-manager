import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, instructorId, capacity, durationMin, location, color } = await req.json();

  if (!name || !capacity || !durationMin) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const gymClass = await db.gymClass.create({
    data: { name, description, instructorId: instructorId || null, capacity, durationMin, location, color },
  });

  return NextResponse.json(gymClass, { status: 201 });
}
