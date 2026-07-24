export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseWeeklySlots } from "@/lib/personalized";

const SLOT_CAPACITY = 2;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "from/to required" }, { status: 400 });

    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T23:59:59");

    // All members' weekly slots
    const members = await db.member.findMany({ select: { weeklyDays: true } });

    // Reservations in range
    const reservations = await db.memberReservation.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, time: true },
    });

    // Cancellations in range (to subtract from recurring)
    const cancellations = await db.memberCancellation.findMany({
      where: { sessionDate: { gte: start, lte: end }, wasRescheduled: false },
      select: { sessionDate: true, sessionTime: true },
    });

    // Build occupancy map: key = "YYYY-MM-DD_HH:MM" -> count
    const occupancy: Record<string, number> = {};

    const addKey = (key: string, delta = 1) => {
      occupancy[key] = (occupancy[key] ?? 0) + delta;
    };

    // Count recurring slots per date
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const jsDay = cur.getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      if (isoDay !== 7) { // skip Sunday
        for (const m of members) {
          for (const slot of parseWeeklySlots(m.weeklyDays)) {
            if (slot.day === isoDay) {
              addKey(`${dateStr}_${slot.time}`);
            }
          }
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Add reservations
    for (const r of reservations) {
      const dateStr = r.date.toISOString().slice(0, 10);
      addKey(`${dateStr}_${r.time}`);
    }

    // Subtract cancellations
    for (const c of cancellations) {
      const dateStr = c.sessionDate.toISOString().slice(0, 10);
      const key = `${dateStr}_${c.sessionTime}`;
      if (occupancy[key]) occupancy[key] = Math.max(0, occupancy[key] - 1);
    }

    // Return as array of { key, count } — client can filter available (count < SLOT_CAPACITY)
    const result = Object.entries(occupancy).map(([key, count]) => ({ key, count, available: count < SLOT_CAPACITY }));

    return NextResponse.json({ slots: result, capacity: SLOT_CAPACITY });
  } catch (err) {
    console.error("[GET /api/member/availability]", err);
    return NextResponse.json({ error: "Σφάλμα" }, { status: 500 });
  }
}
