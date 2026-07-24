export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { amount, method, notes } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Μη έγκυρο ποσό" }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: {
      subscriptionId: id,
      amount,
      method: method ?? "CASH",
      notes,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
