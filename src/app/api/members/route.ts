import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, password, dateOfBirth, emergencyContact, notes } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Το email χρησιμοποιείται ήδη" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: "MEMBER",
      member: {
        create: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          emergencyContact: emergencyContact || null,
          notes: notes || null,
        },
      },
    },
    include: { member: true },
  });

  return NextResponse.json({ id: user.member!.id }, { status: 201 });
}
