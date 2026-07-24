"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GymClass { id: string; name: string; durationMin: number; color: string | null }

export default function NewSessionForm({ classes, weekOffset }: { classes: GymClass[]; weekOffset: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      classId: form.get("classId"),
      startsAt: form.get("startsAt"),
    };

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Σφάλμα");
      return;
    }

    router.push(`/dashboard/schedule?week=${weekOffset}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Μάθημα *</label>
        <select
          name="classId"
          required
          defaultValue=""
          onChange={(e) => setSelectedClass(classes.find((c) => c.id === e.target.value) ?? null)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Επίλεξε μάθημα...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {selectedClass && (
          <p className="text-xs text-slate-400 mt-1">Διάρκεια: {selectedClass.durationMin} λεπτά</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ημερομηνία & Ώρα έναρξης *</label>
        <input
          name="startsAt"
          type="datetime-local"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Ακύρωση
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {loading ? "Αποθήκευση..." : "Προσθήκη στο πρόγραμμα"}
        </button>
      </div>
    </form>
  );
}
