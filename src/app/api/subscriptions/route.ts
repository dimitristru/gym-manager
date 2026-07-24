export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId, planId, startDate, paymentAmount, paymentMethod, customPrice } = await req.json();

  if (!memberId || !planId || !startDate) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Πακέτο δεν βρέθηκε" }, { status: 404 });

  // Enforce one active subscription per member
  const existing = await db.subscription.findFirst({
    where: { memberId, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Το μέλος έχει ήδη ενεργή συνδρομή. Απενεργοποίησέ την πρώτα." },
      { status: 409 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(start);
  if (plan.durationDays) {
    end.setDate(end.getDate() + plan.durationDays);
  } else {
    // Ongoing plan: set far-future end date (year 9999)
    end.setFullYear(9999);
  }

  const subscription = await db.subscription.create({
    data: {
      memberId,
      planId,
      startDate: start,
      endDate: end,
      classesLeft: plan.maxClasses ?? null,
      // For personalized plans, store the calculated price in the payment notes
      status: "ACTIVE",
      ...(paymentAmount
        ? {
            payments: {
              create: {
                amount: paymentAmount,
                method: paymentMethod ?? "CASH",
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ id: subscription.id }, { status: 201 });
}
