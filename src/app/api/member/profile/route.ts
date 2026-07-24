import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email, phone } = await req.json();
    if (!email) return NextResponse.json({ error: "Το email είναι υποχρεωτικό" }, { status: 400 });

    // Check email not taken by another user
    const existing = await db.user.findFirst({
      where: { email, NOT: { email: session.user.email! } },
    });
    if (existing) return NextResponse.json({ error: "Αυτό το email χρησιμοποιείται ήδη" }, { status: 409 });

    const updated = await db.user.update({
      where: { email: session.user.email! },
      data: { email, phone: phone ?? null },
    });

    return NextResponse.json({ email: updated.email, phone: updated.phone });
  } catch (err) {
    console.error("[PATCH /api/member/profile]", err);
    return NextResponse.json({ error: "Σφάλμα αποθήκευσης" }, { status: 500 });
  }
}
