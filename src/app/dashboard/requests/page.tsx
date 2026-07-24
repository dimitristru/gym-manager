import { db } from "@/lib/db";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const [scheduleReqs, scheduleHistory, subReqs, subHistory] = await Promise.all([
    db.scheduleChangeRequest.findMany({
      where: { status: "PENDING" },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.scheduleChangeRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
    db.subscriptionRequest.findMany({
      where: { status: "PENDING" },
      include: {
        member: { include: { user: { select: { name: true } } } },
        plan: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.subscriptionRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        member: { include: { user: { select: { name: true } } } },
        plan: { select: { name: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 10,
    }),
  ]);

  const fmtSchedule = (r: typeof scheduleReqs[number]) => ({
    id: r.id,
    memberName: r.member.nickname ?? r.member.user.name,
    type: r.type as "CANCEL" | "RESCHEDULE",
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    sessionDate: r.sessionDate.toISOString().slice(0, 10),
    sessionTime: r.sessionTime,
    newDate: r.newDate?.toISOString().slice(0, 10) ?? null,
    newTime: r.newTime ?? null,
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
  });

  const fmtSub = (r: typeof subReqs[number]) => ({
    id: r.id,
    memberName: r.member.nickname ?? r.member.user.name,
    type: r.type as "NEW" | "CANCEL_SUB",
    planName: r.plan?.name ?? null,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
  });

  return (
    <RequestsClient
      pending={scheduleReqs.map(fmtSchedule)}
      history={scheduleHistory.map(fmtSchedule)}
      pendingSub={subReqs.map(fmtSub)}
      historySub={subHistory.map(fmtSub)}
    />
  );
}
