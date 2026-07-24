import { db } from "@/lib/db";
import Link from "next/link";
import NewClassForm from "./NewClassForm";

async function getData() {
  const [classes, instructors] = await Promise.all([
    db.gymClass.findMany({
      include: { instructor: true },
      orderBy: { name: "asc" },
    }),
    db.instructor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return { classes, instructors };
}

export default async function ClassesPage() {
  const { classes, instructors } = await getData();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Μαθήματα & Γυμναστές</h1>
        <p className="text-slate-500 text-sm mt-1">Διαχείριση τύπων μαθημάτων</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Classes list */}
        <div>
          <h2 className="font-semibold text-slate-700 mb-3 text-sm tracking-wider">ΜΑΘΗΜΑΤΑ ({classes.length})</h2>
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color ?? "#3b82f6" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.durationMin} λεπτά · {c.capacity} άτομα
                    {c.instructor ? ` · ${c.instructor.name}` : ""}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {c.isActive ? "Ενεργό" : "Ανενεργό"}
                </span>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-slate-400">Δεν υπάρχουν μαθήματα.</p>}
          </div>

          {/* Instructors */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700 text-sm tracking-wider">ΓΥΜΝΑΣΤΕΣ ({instructors.length})</h2>
              <Link href="/dashboard/schedule/classes/instructors/new" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                + Νέος
              </Link>
            </div>
            <div className="space-y-2">
              {instructors.map((ins) => (
                <div key={ins.id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {ins.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{ins.name}</p>
                    {ins.specialty && <p className="text-xs text-slate-500">{ins.specialty}</p>}
                  </div>
                </div>
              ))}
              {instructors.length === 0 && <p className="text-sm text-slate-400">Δεν υπάρχουν γυμναστές.</p>}
            </div>
          </div>
        </div>

        {/* New class form */}
        <div>
          <NewClassForm instructors={instructors.map((i) => ({ id: i.id, name: i.name }))} />
        </div>
      </div>
    </div>
  );
}
