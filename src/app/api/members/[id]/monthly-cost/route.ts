export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { countClassesInMonth, parseWeeklyDays } from "@/lib/personalized";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const pricePerClass = parseFloat(searchParams.get("pricePerClass") ?? "0");

  const member = await db.member.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "Μέλος δεν βρέθηκε" }, { status: 404 });

  const days = parseWeeklyDays(member.weeklyDays);
  const classCount = countClassesInMonth(year, month, days);
  const totalCost = classCount * pricePerClass;

  return NextResponse.json({ days, classCount, totalCost, year, month });
}
