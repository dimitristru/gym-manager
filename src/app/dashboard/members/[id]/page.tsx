import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "@/lib/utils";
import { parseWeeklySlots, DAY_NAMES } from "@/lib/personalized";

async function getMember(id: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const member = await db.member.findUnique({
    where: { id },
    include: {
      user: true,
      subscriptions: {
        include: { plan: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
      checkIns: {
        orderBy: { checkedAt: "desc" },
        take: 30,
      },
      cancellations: {
        orderBy: { cancelledAt: "desc" },
        take: 50,
      },
    },
  });
  if (!member) return null;

  const checkInsThisMonth = member.checkIns.filter((c) => c.date >= monthStart && c.date <= monthEnd);
  const cancelThisMonth = member.cancellations.filter((c) => c.sessionDate >= monthStart && c.sessionDate <= monthEnd);
  const lateCancel = cancelThisMonth.filter((c) => c.isLate && !c.wasRescheduled);
  const onTimeCancel = cancelThisMonth.filter((c) => !c.isLate && !c.wasRescheduled);
  const rescheduled = cancelThisMonth.filter((c) => c.wasRescheduled);

  // Scheduled sessions this month (recurring)
  const slots = parseWeeklySlots(member.weeklyDays);
  let recurringCountThisMonth = 0;
  const daysInMonth = monthEnd.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const jsDay = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    recurringCountThisMonth += slots.filter((s) => s.day === isoDay).length;
  }

  const attendanceRate = recurringCountThisMonth > 0
    ? Math.round((checkInsThisMonth.length / recurringCountThisMonth) * 100)
    : null;

  return {
    member,
    stats: {
      checkInsThisMonth: checkInsThisMonth.length,
      totalCheckIns: member.checkIns.length,
      lateCancel: lateCancel.length,
      onTimeCancel: onTimeCancel.length,
      rescheduled: rescheduled.length,
      recurringThisMonth: recurringCountThisMonth,
      attendanceRate,
    },
    recentCheckIns: member.checkIns.slice(0, 10),
    recentCancellations: member.cancellations.slice(0, 10),
  };
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMember(id);
  if (!data) notFound();
  const { member, stats, recentCheckIns, recentCancellations } = data;

  const now = new Date();
  const monthLabel = now.toLocaleDateString("el-GR", { month: "long", year: "numeric" });

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/members" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Πίσω στα μέλη
      </Link>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {member.user.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{member.user.name}</h1>
              {member.nickname && <p className="text-sm font-medium" style={{ color: "#f97316" }}>"{member.nickname}"</p>}
              <p className="text-slate-500 text-sm">{member.user.email}</p>
              {member.user.phone && <p className="text-slate-500 text-sm">{member.user.phone}</p>}
            </div>
          </div>
          <Link href={`/dashboard/members/${id}/edit`}
            className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Επεξεργασία
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΕΓΓΡΑΦΗ</p>
            <p className="text-sm text-slate-900 mt-1">{format.date(member.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΗΜ. ΓΕΝΝΗΣΗΣ</p>
            <p className="text-sm text-slate-900 mt-1">{member.dateOfBirth ? format.date(member.dateOfBirth) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΕΠΑΦΗ ΑΝΑΓΚΗΣ</p>
            <p className="text-sm text-slate-900 mt-1">{member.emergencyContact ?? "—"}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 tracking-wider font-medium mb-2">ΣΤΑΘΕΡΟ ΕΒΔΟΜΑΔΙΑΙΟ ΠΡΟΓΡΑΜΜΑ</p>
          {member.weeklyDays ? (
            <div className="flex gap-2 flex-wrap">
              {parseWeeklySlots(member.weeklyDays).map((s) => (
                <span key={s.day} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200">
                  {DAY_NAMES[s.day]} <span className="text-blue-400">·</span> {s.time}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Δεν έχει οριστεί σταθερό πρόγραμμα</p>
          )}
        </div>

        {member.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 tracking-wider font-medium mb-1">ΣΗΜΕΙΩΣΕΙΣ</p>
            <p className="text-sm text-slate-700">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Stats this month */}
      <div className="rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-900">Στατιστικά</h2>
          <span className="text-xs text-slate-400 capitalize">{monthLabel}</span>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#10b98112", border: "1px solid #10b98125" }}>
            <p className="text-2xl font-black" style={{ color: "#10b981" }}>{stats.checkInsThisMonth}</p>
            {stats.attendanceRate !== null && (
              <p className="text-[10px] font-bold mt-0.5" style={{ color: "#10b981" }}>{stats.attendanceRate}%</p>
            )}
            <p className="text-xs mt-1 text-slate-500">Παρουσίες</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#3b82f612", border: "1px solid #3b82f625" }}>
            <p className="text-2xl font-black" style={{ color: "#3b82f6" }}>{stats.recurringThisMonth}</p>
            <p className="text-xs mt-1 text-slate-500">Προγρ/μένες</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: stats.onTimeCancel > 0 ? "#f59e0b12" : "#14141480", border: `1px solid ${stats.onTimeCancel > 0 ? "#f59e0b25" : "#1e1e1e"}` }}>
            <p className="text-2xl font-black" style={{ color: stats.onTimeCancel > 0 ? "#f59e0b" : "#52525b" }}>{stats.onTimeCancel}</p>
            <p className="text-xs mt-1 text-slate-500">Ακυρώσεις</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: stats.lateCancel > 0 ? "#ef444412" : "#14141480", border: `1px solid ${stats.lateCancel > 0 ? "#ef444425" : "#1e1e1e"}` }}>
            <p className="text-2xl font-black" style={{ color: stats.lateCancel > 0 ? "#ef4444" : "#52525b" }}>{stats.lateCancel}</p>
            <p className="text-xs mt-1 text-slate-500">Αργές ακυρ.</p>
          </div>
        </div>
        {stats.rescheduled > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: "#7c3aed12", border: "1px solid #7c3aed25" }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span style={{ color: "#7c3aed" }}><strong>{stats.rescheduled}</strong> αλλαγές ημερομηνίας αυτό τον μήνα</span>
          </div>
        )}
        {stats.lateCancel > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm mt-2" style={{ backgroundColor: "#ef444412", border: "1px solid #ef444425" }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: "#ef4444" }}><strong>{stats.lateCancel}</strong> αργές ακυρώσεις — χρεώνονται κανονικά</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* Subscriptions */}
        <div className="col-span-3 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Συνδρομές</h2>
            <Link href={`/dashboard/subscriptions/new?memberId=${id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Νέα</Link>
          </div>
          {member.subscriptions.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Δεν υπάρχουν συνδρομές</p>
          ) : (
            <div className="space-y-3">
              {member.subscriptions.map((sub) => (
                <Link key={sub.id} href={`/dashboard/subscriptions/${sub.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors block">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sub.plan.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{format.date(sub.startDate)} — {format.date(sub.endDate)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    sub.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                    sub.status === "EXPIRED" ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-600"
                  }`}>
                    {sub.status === "ACTIVE" ? "Ενεργή" : sub.status === "EXPIRED" ? "Ληγμένη" : "Ακυρωμένη"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        <div className="col-span-2 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Πρόσφατες είσοδοι</h2>
            <span className="text-xs text-slate-400">{stats.totalCheckIns} σύνολο</span>
          </div>
          {recentCheckIns.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Καμία είσοδος ακόμα</p>
          ) : (
            <div className="space-y-2">
              {recentCheckIns.map((ci) => (
                <div key={ci.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">
                      {new Date(ci.date).toLocaleDateString("el-GR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </p>
                    <p className="text-xs text-slate-400">{ci.time} · check-in {new Date(ci.checkedAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation history */}
      {recentCancellations.length > 0 && (
        <div className="rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Ιστορικό ακυρώσεων / αλλαγών</h2>
          <div className="space-y-2">
            {recentCancellations.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl" style={{ backgroundColor: "#141414" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.isLate ? "#ef4444" : c.wasRescheduled ? "#7c3aed" : "#f59e0b" }} />
                <div className="flex-1">
                  <p className="text-sm text-slate-900">
                    {new Date(c.sessionDate).toLocaleDateString("el-GR", { weekday: "short", day: "2-digit", month: "2-digit" })} · {c.sessionTime}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.wasRescheduled ? "Αλλαγή ημερομηνίας" : "Ακύρωση"} · {new Date(c.cancelledAt).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
                {c.isLate && !c.wasRescheduled && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>Αργά</span>
                )}
                {c.wasRescheduled && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#7c3aed20", color: "#7c3aed" }}>Αλλαγή</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
