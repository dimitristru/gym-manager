import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function getStats() {
  const [totalMembers, activeSubscriptions, todayCheckins, upcomingClasses] =
    await Promise.all([
      db.member.count(),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.checkIn.count({
        where: {
          checkedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.classSchedule.count({
        where: {
          startsAt: { gte: new Date() },
          isCancelled: false,
        },
      }),
    ]);

  return { totalMembers, activeSubscriptions, todayCheckins, upcomingClasses };
}

const stats = [
  {
    label: "Συνολικά μέλη",
    key: "totalMembers" as const,
    color: "bg-blue-500",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Ενεργές συνδρομές",
    key: "activeSubscriptions" as const,
    color: "bg-emerald-500",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: "Check-in σήμερα",
    key: "todayCheckins" as const,
    color: "bg-violet-500",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Επερχόμενα μαθήματα",
    key: "upcomingClasses" as const,
    color: "bg-orange-500",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default async function DashboardPage() {
  const [session, data] = await Promise.all([auth(), getStats()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Καλωσήρθες, {session?.user?.name} 👋
        </h1>
        <p className="mt-1" style={{ color: "#71717a" }}>
          {new Date().toLocaleDateString("el-GR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="rounded-2xl p-6 flex items-center gap-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
          >
            <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{data[stat.key]}</p>
              <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
