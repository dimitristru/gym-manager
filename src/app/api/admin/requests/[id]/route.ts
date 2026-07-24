import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action, reviewNote } = await req.json(); // action: "approve" | "reject"

    const changeReq = await db.scheduleChangeRequest.findUnique({
      where: { id },
      include: { member: true },
    });
    if (!changeReq) return NextResponse.json({ error: "Δεν βρέθηκε" }, { status: 404 });

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // If approved, apply the change
    if (action === "approve") {
      if (changeReq.type === "NEW_SESSION") {
        // Create a reservation for the requested slot
        await db.memberReservation.create({
          data: {
            memberId: changeReq.memberId,
            date: changeReq.sessionDate,
            time: changeReq.sessionTime,
          },
        });
      } else if (changeReq.type === "CANCEL") {
        // Create a MemberCancellation record
        const now = new Date();
        const [h, m] = changeReq.sessionTime.split(":").map(Number);
        const sessionDt = new Date(changeReq.sessionDate);
        sessionDt.setHours(h, m, 0, 0);
        const isLate = now > new Date(sessionDt.getTime() - 5 * 60 * 60 * 1000);

        await db.memberCancellation.create({
          data: {
            memberId: changeReq.memberId,
            sessionDate: changeReq.sessionDate,
            sessionTime: changeReq.sessionTime,
            isLate,
            wasRescheduled: false,
          },
        });
      } else if (changeReq.type === "RESCHEDULE" && changeReq.newDate && changeReq.newTime) {
        // Create cancellation for old session + reservation for new
        await db.memberCancellation.create({
          data: {
            memberId: changeReq.memberId,
            sessionDate: changeReq.sessionDate,
            sessionTime: changeReq.sessionTime,
            isLate: false,
            wasRescheduled: true,
          },
        });
        await db.memberReservation.create({
          data: {
            memberId: changeReq.memberId,
            date: changeReq.newDate,
            time: changeReq.newTime,
            movedFrom: changeReq.sessionDate,
          },
        });
      }
    }

    const updated = await db.scheduleChangeRequest.update({
      where: { id },
      data: { status: newStatus, reviewedAt: new Date(), reviewNote: reviewNote || null },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/requests]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
