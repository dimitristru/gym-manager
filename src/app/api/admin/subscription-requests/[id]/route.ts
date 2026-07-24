export const dynamic = "force-dynamic";
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
    const { action, reviewNote } = await req.json();

    const subReq = await db.subscriptionRequest.findUnique({ where: { id } });
    if (!subReq) return NextResponse.json({ error: "Δεν βρέθηκε" }, { status: 404 });

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    if (action === "approve" && subReq.type === "CANCEL_SUB" && subReq.subscriptionId) {
      await db.subscription.update({
        where: { id: subReq.subscriptionId },
        data: { status: "CANCELLED" },
      });
    }

    const updated = await db.subscriptionRequest.update({
      where: { id },
      data: { status: newStatus, reviewedAt: new Date(), reviewNote: reviewNote || null },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/subscription-requests]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
