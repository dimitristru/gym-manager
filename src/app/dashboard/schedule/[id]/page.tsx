import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "@/lib/utils";

async function getSession(id: string) {
  return db.classSchedule.findUnique({
    where: { id },
    include: {
      class: { include: { instructor: true } },
      bookings: {
        where: { cancelled: false },
        include: { member: { include: { user: true } } },
        orderBy: { bookedAt: "asc" },
      },
    },
  });
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const spotsLeft = session.class.capacity - session.bookings.length;

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/schedule" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Πίσω στο πρόγραμμα
      </Link>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session.class.color ?? "#3b82f6" }} />
              <h1 className="text-xl font-bold text-slate-900">{session.class.name}</h1>
            </div>
            {session.class.instructor && (
              <p className="text-slate-500 text-sm">Εκπαιδευτής: {session.class.instructor.name}</p>
            )}
          </div>
          {session.isCancelled && (
            <span className="px-3 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-full">Ακυρωμένο</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΗΜΕΡΟΜΗΝΙΑ</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {new Date(session.startsAt).toLocaleDateString("el-GR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΩΡΑ</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {new Date(session.startsAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
              {" — "}
              {new Date(session.endsAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΘΕΣΕΙΣ</p>
            <p className={`text-sm font-semibold mt-1 ${spotsLeft === 0 ? "text-red-600" : "text-emerald-600"}`}>
              {session.bookings.length}/{session.class.capacity} κρατήσεις
            </p>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-900">Κρατήσεις ({session.bookings.length})</h2>
          {spotsLeft > 0 && !session.isCancelled && (
            <Link
              href={`/dashboard/schedule/${id}/book`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Κράτηση
            </Link>
          )}
        </div>

        {session.bookings.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Δεν υπάρχουν κρατήσεις ακόμα</p>
        ) : (
          <div className="space-y-2">
            {session.bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {b.member.user.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{b.member.user.name}</p>
                  <p className="text-xs text-slate-400">Κράτηση: {format.date(b.bookedAt)}</p>
                </div>
                <Link href={`/dashboard/members/${b.member.id}`} className="text-xs text-slate-400 hover:text-blue-600">
                  Προφίλ →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
