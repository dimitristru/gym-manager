import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, phone, specialty } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Το όνομα είναι υποχρεωτικό" }, { status: 400 });
  }

  const instructor = await db.instructor.create({
    data: { name, email: email || null, phone: phone || null, specialty: specialty || null },
  });

  return NextResponse.json(instructor, { status: 201 });
}
