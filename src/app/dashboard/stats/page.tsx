import { db } from "@/lib/db";
import { parseWeeklySlots } from "@/lib/personalized";
import StatsClient from "./StatsClient";

const SLOT_CAPACITY = 2;
const HOURS_PER_DAY = 13; // 09:00–21:00

function workingDaysInRange(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur <= endDay) {
    if (cur.getDay() !== 0) count++; // exclude Sunday
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

async function getStats(start: Date, end: Date, memberId: string | null) {
  const now = new Date();
  const isFuturePeriod = start > now;

  const [checkIns, cancellations, subscriptions, payments] = await Promise.all([
    db.checkIn.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(memberId ? { memberId } : {}),
      },
    }),
    db.memberCancellation.findMany({
      where: {
        sessionDate: { gte: start, lte: end },
        ...(memberId ? { memberId } : {}),
      },
    }),
    db.subscription.findMany({
      where: isFuturePeriod
        ? {
            // For future periods: use currently active subscriptions as proxy for expected cost
            startDate: { lte: now },
            endDate: { gte: now },
            ...(memberId ? { memberId } : {}),
          }
        : {
            startDate: { lte: end },
            endDate: { gte: start },
            ...(memberId ? { memberId } : {}),
          },
      include: {
        plan: true,
        payments: true,
        member: { include: { user: { select: { name: true } } } },
      },
    }),
    db.payment.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        ...(memberId ? { subscription: { memberId } } : {}),
      },
    }),
  ]);

  // ── Schedule stats ────────────────────────────────────────────────
  const workDays = workingDaysInRange(start, end);
  const totalSlots = workDays * HOURS_PER_DAY * SLOT_CAPACITY;
  const filledSlots = checkIns.length;
  const emptySlots = Math.max(0, totalSlots - filledSlots);
  const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const totalCancellations = cancellations.length;
  const lateCancellations = cancellations.filter((c) => c.isLate).length;
  const reschedules = cancellations.filter((c) => c.wasRescheduled).length;

  // Member-specific: scheduled vs attended
  let memberScheduled = 0;
  let memberAttendanceRate: number | null = null;
  if (memberId) {
    const m = await db.member.findUnique({ where: { id: memberId } });
    if (m) {
      const slots = parseWeeklySlots(m.weeklyDays);
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);
      while (cur <= endDay) {
        const jsDay = cur.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        memberScheduled += slots.filter((s) => s.day === isoDay).length;
        cur.setDate(cur.getDate() + 1);
      }
      const reservations = await db.memberReservation.findMany({
        where: { memberId, date: { gte: start, lte: end } },
      });
      memberScheduled += reservations.length;
      memberAttendanceRate = memberScheduled > 0
        ? Math.round((filledSlots / memberScheduled) * 100)
        : null;
    }
  }

  // ── Financial stats ───────────────────────────────────────────────
  // Fixed subscriptions: show total price + all-time payments (no monthly fee concept)
  const subscriptionTotal = subscriptions.reduce((sum, s) => {
    if (s.plan.isPersonalized) return sum;
    return sum + Number(s.plan.price);
  }, 0);

  // All-time paid across these subscriptions
  const subscriptionPaid = subscriptions.reduce(
    (sum, s) => sum + s.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0
  );

  const subscriptionOutstanding = Math.max(0, subscriptionTotal - subscriptionPaid);

  // Personalized plans: expected revenue = pricePerClass × sessions in period
  const personalizedRevenue = subscriptions.reduce((sum, s) => {
    if (!s.plan.isPersonalized || !s.plan.pricePerClass) return sum;
    const sessions = memberId ? memberScheduled : 0;
    return sum + Number(s.plan.pricePerClass) * sessions;
  }, 0);

  // Payments made in this period (for personalized plans display)
  const periodPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    schedule: {
      totalSlots,
      filledSlots,
      emptySlots,
      fillRate,
      totalCancellations,
      lateCancellations,
      reschedules,
      workDays,
      memberScheduled: memberId ? memberScheduled : null,
      memberAttendanceRate,
    },
    financial: {
      subscriptionTotal,
      subscriptionPaid,
      subscriptionOutstanding,
      personalizedRevenue,
      periodPaid,
      subscriptionCount: subscriptions.length,
      breakdown: subscriptions
        .filter((s) => !s.plan.isPersonalized)
        .map((s) => {
          const paid = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
          return {
            id: s.id,
            memberName: s.member.nickname ?? s.member.user.name,
            planName: s.plan.name,
            total: Number(s.plan.price),
            paid,
            outstanding: Math.max(0, Number(s.plan.price) - paid),
            startDate: s.startDate.toISOString().slice(0, 10),
            endDate: s.endDate.getFullYear() === 9999 ? null : s.endDate.toISOString().slice(0, 10),
          };
        }),
    },
  };
}

async function getMembers() {
  const members = await db.member.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => ({
    id: m.id,
    name: m.nickname ?? m.user.name,
    fullName: m.user.name,
  }));
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

const MONTHS_EL = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; memberId?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // Default: current month
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const fromStr = params.from ?? toISO(defaultFrom);
  const toStr = params.to ?? toISO(defaultTo);
  const memberId = params.memberId ?? null;

  const start = new Date(fromStr + "T00:00:00");
  const end = new Date(toStr + "T23:59:59.999");

  const [stats, members] = await Promise.all([
    getStats(start, end, memberId),
    getMembers(),
  ]);

  // Build month options: 12 months back + 2 ahead
  const monthOptions = [];
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
    const last = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    monthOptions.push({
      label: `${MONTHS_EL[d.getMonth()]} ${d.getFullYear()}`,
      from: first,
      to: last,
    });
  }
  monthOptions.reverse();

  // Period label for display
  const sameDay = fromStr === toStr;
  const fromDate = new Date(fromStr + "T00:00:00");
  const toDate = new Date(toStr + "T00:00:00");
  let periodLabel: string;
  if (sameDay) {
    periodLabel = fromDate.toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
  } else {
    periodLabel = `${fromDate.toLocaleDateString("el-GR", { day: "numeric", month: "short" })} – ${toDate.toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  const selectedMember = memberId ? members.find((m) => m.id === memberId) : null;

  return (
    <StatsClient
      stats={stats}
      members={members}
      monthOptions={monthOptions}
      fromStr={fromStr}
      toStr={toStr}
      selectedMemberId={memberId}
      selectedMemberName={selectedMember?.name ?? null}
      periodLabel={periodLabel}
    />
  );
}
