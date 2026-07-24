import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, description, durationDays, price, maxClasses, isPersonalized, pricePerClass, isActive } = await req.json();

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: {
        name,
        description: description || null,
        durationDays: durationDays ?? null,
        price: isPersonalized ? 0 : price,
        maxClasses: maxClasses || null,
        isPersonalized: !!isPersonalized,
        pricePerClass: isPersonalized ? pricePerClass : null,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({
      ...plan,
      price: plan.price.toString(),
      pricePerClass: plan.pricePerClass?.toString() ?? null,
    });
  } catch (err) {
    console.error("[PATCH /api/plans]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.subscriptionPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
