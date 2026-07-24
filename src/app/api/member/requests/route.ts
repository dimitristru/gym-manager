export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { memberId, type, sessionDate, sessionTime, newDate, newTime, note } = await req.json();

    // Verify the member belongs to the logged-in user
    const member = await db.member.findFirst({
      where: { id: memberId, user: { email: session.user!.email! } },
    });
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Check no duplicate pending request for same session
    const existing = await db.scheduleChangeRequest.findFirst({
      where: { memberId, sessionDate: new Date(sessionDate), sessionTime, status: "PENDING" },
    });
    if (existing) return NextResponse.json({ error: "Υπάρχει ήδη εκκρεμές αίτημα για αυτή την προπόνηση" }, { status: 409 });

    const request = await db.scheduleChangeRequest.create({
      data: {
        memberId,
        type,
        sessionDate: new Date(sessionDate),
        sessionTime,
        newDate: newDate ? new Date(newDate) : null,
        newTime: newTime || null,
        note: note || null,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error("[POST /api/member/requests]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
