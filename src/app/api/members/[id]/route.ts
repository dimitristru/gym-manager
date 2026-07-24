import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, nickname, phone, dateOfBirth, emergencyContact, notes, weeklyDays } = await req.json();

  const member = await db.member.findUnique({ where: { id }, include: { user: true } });
  if (!member) return NextResponse.json({ error: "Μέλος δεν βρέθηκε" }, { status: 404 });

  try {
    await db.$transaction([
      db.user.update({
        where: { id: member.userId },
        data: { name: name ?? member.user.name, phone: phone || null },
      }),
      db.member.update({
        where: { id },
        data: {
          nickname: nickname || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          emergencyContact: emergencyContact || null,
          notes: notes || null,
          weeklyDays: weeklyDays ?? null,
        },
      }),
    ]);
  } catch (err) {
    console.error("Member update error:", err);
    return NextResponse.json({ error: "Σφάλμα αποθήκευσης στη βάση" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
