import { db } from "@/lib/db";
import Link from "next/link";
import WeeklyScheduleInteractive from "./WeeklyScheduleInteractive";
import { parseWeeklySlots } from "@/lib/personalized";

function getWeekRange(offsetDays = 0) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetDays * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

async function getData(weekOffset: number) {
  const { monday, sunday } = getWeekRange(weekOffset);

  const [schedules, members, reservations, pendingRequests] = await Promise.all([
    db.classSchedule.findMany({
      where: { startsAt: { gte: monday, lte: sunday } },
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
      where: { date: { gte: monday, lte: sunday } },
      include: { member: { select: { id: true, nickname: true, user: { select: { name: true } } } } },
    }),
    db.scheduleChangeRequest.findMany({
      where: { status: "PENDING", sessionDate: { gte: monday, lte: sunday } },
      select: { sessionDate: true, sessionTime: true },
    }),
  ]);

  // Recurring slots for Mon–Sat of this week
  const recurringSlots = members.flatMap((m: typeof members[number]) =>
    parseWeeklySlots(m.weeklyDays).map((slot) => ({
      memberId: m.id,
      memberName: m.nickname ?? m.user.name,
      day: slot.day,
      time: slot.time,
    }))
  );

  const serializedSchedules = schedules.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    isCancelled: s.isCancelled,
    class: {
      id: s.class.id,
      name: s.class.name,
      color: s.class.color,
      capacity: s.class.capacity,
      instructor: s.class.instructor ? { name: s.class.instructor.name } : null,
    },
    bookings: s.bookings.map((b) => ({ id: b.id, memberName: b.member.user.name })),
  }));

  const serializedMembers = members.map((m) => ({
    id: m.id,
    name: m.user.name,
    nickname: m.nickname ?? null,
    slots: parseWeeklySlots(m.weeklyDays),
  }));

  const serializedReservations = reservations.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.member.nickname ?? r.member.user.name,
    date: r.date.toISOString(),
    time: r.time,
  }));

  const pendingKeys = pendingRequests.map((r) => `${r.sessionDate.toISOString().slice(0, 10)}_${r.sessionTime}`);

  return { schedules: serializedSchedules, recurringSlots, monday, sunday, members: serializedMembers, reservations: serializedReservations, pendingKeys };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekOffset = parseInt(week ?? "0");
  const { schedules, recurringSlots, monday, sunday, members, reservations, pendingKeys } = await getData(weekOffset);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Πρόγραμμα</h1>
          <p className="text-slate-500 text-sm mt-1">
            {monday.toLocaleDateString("el-GR", { day: "2-digit", month: "long" })} —{" "}
            {sunday.toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/schedule/monthly"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Μηνιαίο
          </Link>
          <Link
            href="/dashboard/schedule/classes"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Μαθήματα
          </Link>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/schedule?week=${weekOffset - 1}`}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Link
          href="/dashboard/schedule?week=0"
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Τρέχουσα εβδομάδα
        </Link>
        <Link
          href={`/dashboard/schedule?week=${weekOffset + 1}`}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <WeeklyScheduleInteractive
        schedules={schedules}
        monday={monday.toISOString()}
        initialSlots={recurringSlots}
        initialReservations={reservations}
        members={members}
        pendingKeys={pendingKeys}
      />
    </div>
  );
}
