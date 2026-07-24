import { db } from "@/lib/db";
import Link from "next/link";
import MonthlyCalendar from "./MonthlyCalendar";
import { parseWeeklySlots } from "@/lib/personalized";

async function getData(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [schedules, members, reservations, pendingRequests] = await Promise.all([
    db.classSchedule.findMany({
      where: { startsAt: { gte: start, lte: end } },
      include: {
        class: { include: { instructor: true } },
        bookings: {
          where: { cancelled: false },
          include: { member: { include: { user: { select: { name: true } } } } },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.member.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.memberReservation.findMany({
      where: { date: { gte: start, lte: end } },
      include: { member: { select: { id: true, nickname: true, user: { select: { name: true } } } } },
    }),
    db.scheduleChangeRequest.findMany({
      where: { status: "PENDING", sessionDate: { gte: start, lte: end } },
      select: { sessionDate: true },
    }),
  ]);

  const daysInMonth = end.getDate();
  const recurringSlots = members.flatMap((m: typeof members[number]) => {
    return parseWeeklySlots(m.weeklyDays).flatMap((slot) => {
      const results = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const jsDay = date.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        if (isoDay === slot.day) {
          results.push({ memberId: m.id, memberName: m.nickname ?? m.user.name, day: d, time: slot.time, isoWeekDay: slot.day });
        }
      }
      return results;
    });
  });

  const serializedSchedules = schedules.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    isCancelled: s.isCancelled,
    className: s.class.name,
    color: s.class.color,
    capacity: s.class.capacity,
    bookingsCount: s.bookings.length,
    memberNames: s.bookings.map((b) => b.member.user.name),
  }));

  const serializedReservations = reservations.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.member.nickname ?? r.member.user.name,
    day: new Date(r.date).getDate(),
    time: r.time,
    dateISO: r.date.toISOString(),
  }));

  const serializedMembers = members.map((m) => ({
    id: m.id,
    name: m.nickname ?? m.user.name,
    slots: parseWeeklySlots(m.weeklyDays),
  }));

  const pendingDays = [...new Set(pendingRequests.map((r) => new Date(r.sessionDate).getDate()))];

  return {
    schedules: serializedSchedules,
    recurringSlots,
    reservations: serializedReservations,
    members: serializedMembers,
    daysInMonth,
    firstDayOfWeek: (new Date(year, month - 1, 1).getDay() + 6) % 7,
    pendingDays,
  };
}

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const { year: y, month: m } = await searchParams;
  const now = new Date();
  const year = parseInt(y ?? String(now.getFullYear()));
  const month = parseInt(m ?? String(now.getMonth() + 1));

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const { schedules, recurringSlots, reservations, members, daysInMonth, firstDayOfWeek, pendingDays } = await getData(year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("el-GR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Πρόγραμμα</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{monthName}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/schedule" className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Εβδομαδιαίο</Link>
          <Link href="/dashboard/schedule/classes" className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Μαθήματα</Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/schedule/monthly?year=${prevYear}&month=${prevMonth}`} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <Link href={`/dashboard/schedule/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Τρέχων μήνας</Link>
        <Link href={`/dashboard/schedule/monthly?year=${nextYear}&month=${nextMonth}`} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>

      <MonthlyCalendar
        year={year} month={month} daysInMonth={daysInMonth} firstDayOfWeek={firstDayOfWeek}
        schedules={schedules} recurringSlots={recurringSlots}
        initialReservations={reservations} members={members}
        pendingDays={pendingDays}
      />
    </div>
  );
}
