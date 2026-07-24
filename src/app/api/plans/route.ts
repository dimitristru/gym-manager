export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, durationDays, price, maxClasses, isPersonalized, pricePerClass } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
    }

    if (isPersonalized && !pricePerClass) {
      return NextResponse.json({ error: "Το προσωποποιημένο πακέτο χρειάζεται τιμή ανά μάθημα" }, { status: 400 });
    }

    if (!isPersonalized && price == null) {
      return NextResponse.json({ error: "Λείπει η τιμή" }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.create({
      data: {
        name,
        description: description || null,
        durationDays,
        price: isPersonalized ? 0 : price,
        maxClasses: maxClasses || null,
        isPersonalized: !!isPersonalized,
        pricePerClass: isPersonalized ? pricePerClass : null,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error("[POST /api/plans]", err);
    return NextResponse.json({ error: "Εσωτερικό σφάλμα server" }, { status: 500 });
  }
}
