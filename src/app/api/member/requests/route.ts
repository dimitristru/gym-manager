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

    const sessionDateObj = new Date(sessionDate);

    // Apply the change immediately (no admin approval needed)
    if (type === "NEW_SESSION") {
      await db.memberReservation.create({
        data: { memberId, date: sessionDateObj, time: sessionTime },
      });
    } else if (type === "CANCEL") {
      const now = new Date();
      const [h, m] = sessionTime.split(":").map(Number);
      const sessionDt = new Date(sessionDateObj);
      sessionDt.setHours(h, m, 0, 0);
      const isLate = now > new Date(sessionDt.getTime() - 5 * 60 * 60 * 1000);
      await db.memberCancellation.create({
        data: { memberId, sessionDate: sessionDateObj, sessionTime, isLate, wasRescheduled: false },
      });
    } else if (type === "RESCHEDULE" && newDate && newTime) {
      const [h, m] = sessionTime.split(":").map(Number);
      const sessionDt = new Date(sessionDateObj);
      sessionDt.setHours(h, m, 0, 0);
      const isLate = new Date() > new Date(sessionDt.getTime() - 5 * 60 * 60 * 1000);
      await db.memberCancellation.create({
        data: { memberId, sessionDate: sessionDateObj, sessionTime, isLate, wasRescheduled: true },
      });
      await db.memberReservation.create({
        data: { memberId, date: new Date(newDate), time: newTime, movedFrom: sessionDateObj },
      });
    }

    // Record the change with APPROVED status for history
    const request = await db.scheduleChangeRequest.create({
      data: {
        memberId,
        type,
        sessionDate: sessionDateObj,
        sessionTime,
        newDate: newDate ? new Date(newDate) : null,
        newTime: newTime || null,
        note: note || null,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error("[POST /api/member/requests]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
