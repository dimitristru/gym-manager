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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Μέλη</h1>
          <p className="text-slate-500 text-sm mt-1">{members.length} εγγεγραμμένα μέλη</p>
        </div>
        <Link
          href="/dashboard/members/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Νέο μέλος
        </Link>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Αναζήτηση μέλους..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden">
        {members.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {q ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν μέλη ακόμα"}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΜΕΛΟΣ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΤΗΛΕΦΩΝΟ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΣΥΝΔΡΟΜΗ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΕΓΓΡΑΦΗ</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const sub = member.subscriptions[0];
                const isExpiring =
                  sub && new Date(sub.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {member.user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{member.user.name}</p>
                          <p className="text-slate-500 text-xs">{member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {member.user.phone ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {sub ? (
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isExpiring ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {sub.plan.name}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">
                            έως {format.date(sub.endDate)}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Χωρίς συνδρομή
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format.date(member.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/members/${member.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Προβολή →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
