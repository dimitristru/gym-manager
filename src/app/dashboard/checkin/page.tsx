import { db } from "@/lib/db";
import { parseWeeklySlots } from "@/lib/personalized";
import CheckInClient from "./CheckInClient";

async function getData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isoDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun

  const [members, reservations, checkIns] = await Promise.all([
    db.member.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.memberReservation.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: { member: { select: { id: true, nickname: true, user: { select: { name: true } } } } },
    }),
    db.checkIn.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
  ]);

  // Recurring sessions today (from weeklyDays)
  const recurringToday = members.flatMap((m) =>
    parseWeeklySlots(m.weeklyDays)
      .filter((s) => s.day === isoDay)
      .map((s) => ({
        key: `rec-${m.id}-${s.time}`,
        memberId: m.id,
        memberName: m.nickname ?? m.user.name,
        time: s.time,
        type: "recurring" as const,
        reservationId: null as string | null,
      }))
  );

  // One-time reservations today
  const reservationsToday = reservations.map((r) => ({
    key: `res-${r.id}`,
    memberId: r.memberId,
    memberName: r.member.nickname ?? r.member.user.name,
    time: r.time,
    type: "reservation" as const,
    reservationId: r.id,
  }));

  // Merge: prefer reservation over recurring for same member+time
  const resKeys = new Set(reservations.map((r) => `${r.memberId}-${r.time}`));
  const filtered = recurringToday.filter((r) => !resKeys.has(`${r.memberId}-${r.time}`));
  const scheduled = [...filtered, ...reservationsToday].sort((a, b) => a.time.localeCompare(b.time));

  // All members for walk-in search
  const allMembers = members.map((m) => ({
    id: m.id,
    name: m.nickname ?? m.user.name,
    fullName: m.user.name,
    email: m.user.email,
  }));

  const checkInsToday = checkIns.map((c) => ({
    id: c.id,
    memberId: c.memberId,
    time: c.time,
    checkedAt: c.checkedAt.toISOString(),
  }));

  return {
    scheduled,
    allMembers,
    checkInsToday,
    todayISO: todayStart.toISOString(),
    dateLabel: now.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

export default async function CheckInPage() {
  const data = await getData();
  return <CheckInClient {...data} />;
}
