export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Μη έγκυρη κατάσταση" }, { status: 400 });
  }

  const sub = await db.subscription.update({ where: { id }, data: { status } });
  return NextResponse.json(sub);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // delete payments first (FK constraint)
  await db.payment.deleteMany({ where: { subscriptionId: id } });
  await db.subscription.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
