import { db } from "@/lib/db";
import Link from "next/link";
import { format } from "@/lib/utils";

async function getMembers(search?: string) {
  return db.member.findMany({
    where: search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const members = await getMembers(q);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Μέλη</h1>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>{members.length} εγγεγραμμένα μέλη</p>
        </div>
        <Link
          href="/dashboard/members/new"
          className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Νέο μέλος</span>
          <span className="sm:hidden">Νέο</span>
        </Link>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Αναζήτηση μέλους..."
            className="w-full md:max-w-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {members.length === 0 ? (
        <div className="py-16 text-center" style={{ color: "#71717a" }}>
          <svg className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {q ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν μέλη ακόμα"}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {members.map((member) => {
              const sub = member.subscriptions[0];
              const isExpiring = sub && new Date(sub.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              return (
                <Link
                  key={member.id}
                  href={`/dashboard/members/${member.id}`}
                  className="flex items-center gap-3 p-4 rounded-2xl transition-colors"
                  style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {member.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{member.user.name}</p>
                    <p className="text-xs truncate" style={{ color: "#71717a" }}>{member.user.email}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {sub ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isExpiring ? "bg-amber-900 text-amber-300" : "bg-emerald-900 text-emerald-300"}`}>
                        {sub.plan.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        Χωρίς
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#141414" }}>
                  <th className="text-left text-xs font-semibold tracking-wider px-6 py-3.5" style={{ color: "#71717a" }}>ΜΕΛΟΣ</th>
                  <th className="text-left text-xs font-semibold tracking-wider px-6 py-3.5 hidden lg:table-cell" style={{ color: "#71717a" }}>ΤΗΛΕΦΩΝΟ</th>
                  <th className="text-left text-xs font-semibold tracking-wider px-6 py-3.5" style={{ color: "#71717a" }}>ΣΥΝΔΡΟΜΗ</th>
                  <th className="text-left text-xs font-semibold tracking-wider px-6 py-3.5 hidden lg:table-cell" style={{ color: "#71717a" }}>ΕΓΓΡΑΦΗ</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const sub = member.subscriptions[0];
                  const isExpiring = sub && new Date(sub.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={member.id} className="transition-colors" style={{ borderBottom: "1px solid #1e1e1e" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#141414"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                            {member.user.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{member.user.name}</p>
                            <p className="text-xs" style={{ color: "#71717a" }}>{member.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm hidden lg:table-cell" style={{ color: "#a1a1aa" }}>
                        {member.user.phone ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        {sub ? (
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isExpiring ? "bg-amber-900 text-amber-300" : "bg-emerald-900 text-emerald-300"}`}>
                              {sub.plan.name}
                            </span>
                            <p className="text-xs mt-1" style={{ color: "#71717a" }}>
                              έως {format.date(sub.endDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                            Χωρίς συνδρομή
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm hidden lg:table-cell" style={{ color: "#71717a" }}>
                        {format.date(member.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/members/${member.id}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                          Προβολή →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
