import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseWeeklySlots } from "@/lib/personalized";
import MemberPortal from "./MemberPortal";

// Format a Date using LOCAL timezone (not UTC) — avoids off-by-one in UTC+2/+3
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function MemberPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, plans] = await Promise.all([
    db.user.findUnique({
      where: { email: session.user!.email! },
      include: {
        member: {
          include: {
            changeRequests: { orderBy: { createdAt: "desc" }, take: 50 },
            subscriptions: {
              include: { plan: true, payments: { orderBy: { paidAt: "desc" } } },
              orderBy: { startDate: "desc" },
            },
            subscriptionRequests: {
              include: { plan: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
            reservations: true,
          },
        },
      },
    }),
    db.subscriptionPlan.findMany({ where: { isActive: true, isPersonalized: false }, orderBy: { price: "asc" } }),
  ]);

  if (!user?.member) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "#71717a" }}>Δεν βρέθηκε προφίλ μέλους για αυτόν τον λογαριασμό.</p>
      </div>
    );
  }

  const member = user.member;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from Monday of the current week so the full week is visible
  const mondayOfWeek = new Date(today);
  const dow = today.getDay();
  mondayOfWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const until = new Date(today);
  until.setDate(until.getDate() + 90);

  const weeklySlots = parseWeeklySlots(member.weeklyDays);
  const todayStr = localDate(today);
  const untilStr = localDate(until);

  // Active subscription context
  const activeSub = member.subscriptions.find((s) => s.status === "ACTIVE");
  let activeSubscription = null;
  if (activeSub) {
    const subStart = activeSub.startDate;
    const subEnd = activeSub.endDate;
    const checkInsInPeriod = await db.checkIn.count({
      where: {
        memberId: member.id,
        date: { gte: subStart, ...(subEnd ? { lte: subEnd } : {}) },
      },
    });
    activeSubscription = {
      planName: activeSub.plan.name,
      endDate: subEnd ? localDate(subEnd) : null,
      maxClasses: activeSub.plan.maxClasses ?? null,
      classesLeft: activeSub.classesLeft ?? null,
      classesUsed: checkInsInPeriod,
    };
  }

  // Build sessions from Monday of current week to +90 days using LOCAL dates
  const sessions: { date: string; time: string; type: "recurring" | "reservation" }[] = [];
  const cur = new Date(mondayOfWeek);
  while (cur <= until) {
    const jsDay = cur.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    for (const slot of weeklySlots) {
      if (slot.day === isoDay) {
        sessions.push({ date: localDate(cur), time: slot.time, type: "recurring" });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  for (const r of member.reservations) {
    const rDate = localDate(r.date);
    if (rDate <= untilStr) {
      sessions.push({ date: rDate, time: r.time, type: "reservation" });
    }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Pending CANCEL/RESCHEDULE keys
  const pendingRequestKeys = member.changeRequests
    .filter((r) => r.status === "PENDING" && r.type !== "NEW_SESSION")
    .map((r) => `${localDate(r.sessionDate)}_${r.sessionTime}`);

  // Pending NEW_SESSION ghost slots
  const pendingNewSessions = member.changeRequests
    .filter((r) => r.status === "PENDING" && r.type === "NEW_SESSION")
    .map((r) => ({
      date: localDate(r.sessionDate),
      time: r.sessionTime,
      requestId: r.id,
    }));

  const subscriptions = member.subscriptions.map((sub) => {
    const total = Number(sub.plan.price);
    const paid = sub.payments.reduce((s, p) => s + Number(p.amount), 0);
    return {
      id: sub.id,
      planName: sub.plan.name,
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate?.toISOString() ?? null,
      isOngoing: !sub.plan.durationDays,
      total,
      paid,
      outstanding: Math.max(0, total - paid),
    };
  });

  const serializedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    durationDays: p.durationDays ?? null,
    isPersonalized: p.isPersonalized,
  }));

  const subscriptionRequests = member.subscriptionRequests.map((r) => ({
    id: r.id,
    type: r.type as "NEW" | "CANCEL_SUB",
    planName: r.plan?.name ?? null,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  const changeRequests = member.changeRequests.map((r) => ({
    id: r.id,
    type: r.type as "CANCEL" | "RESCHEDULE" | "NEW_SESSION",
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    sessionDate: localDate(r.sessionDate),
    sessionTime: r.sessionTime,
    newDate: r.newDate ? localDate(r.newDate) : null,
    newTime: r.newTime ?? null,
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <MemberPortal
      memberId={member.id}
      userName={user.name}
      userEmail={user.email}
      userPhone={user.phone ?? null}
      weeklySlots={weeklySlots}
      sessions={sessions}
      pendingRequestKeys={pendingRequestKeys}
      pendingNewSessions={pendingNewSessions}
      activeSubscription={activeSubscription}
      subscriptions={subscriptions}
      plans={serializedPlans}
      subscriptionRequests={subscriptionRequests}
      changeRequests={changeRequests}
    />
  );
}
