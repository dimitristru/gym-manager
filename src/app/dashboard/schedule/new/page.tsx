import { db } from "@/lib/db";
import NewSessionForm from "./NewSessionForm";
import Link from "next/link";

async function getClasses() {
  return db.gymClass.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const classes = await getClasses();

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Νέο session</h1>
        <p className="text-slate-500 text-sm mt-1">Προγραμματισμός μαθήματος στο ωράριο</p>
      </div>
      {classes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          Δεν υπάρχουν μαθήματα.{" "}
          <Link href="/dashboard/schedule/classes" className="font-semibold underline">
            Δημιούργησε μαθήματα πρώτα →
          </Link>
        </div>
      ) : (
        <NewSessionForm classes={classes.map((c) => ({ id: c.id, name: c.name, durationMin: c.durationMin, color: c.color }))} weekOffset={week ?? "0"} />
      )}
    </div>
  );
}
