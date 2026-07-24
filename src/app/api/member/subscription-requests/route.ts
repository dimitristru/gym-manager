export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { memberId, type, planId, subscriptionId, note } = await req.json();

    const member = await db.member.findFirst({
      where: { id: memberId, user: { email: session.user!.email! } },
    });
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Check no duplicate pending request of same type
    const existing = await db.subscriptionRequest.findFirst({
      where: { memberId, type, status: "PENDING" },
    });
    if (existing) return NextResponse.json({ error: "Υπάρχει ήδη εκκρεμές αίτημα" }, { status: 409 });

    const request = await db.subscriptionRequest.create({
      data: { memberId, type, planId: planId ?? null, subscriptionId: subscriptionId ?? null, note: note || null },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error("[POST /api/member/subscription-requests]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
