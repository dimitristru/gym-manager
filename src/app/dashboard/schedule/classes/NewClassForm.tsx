"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

export default function NewClassForm({ instructors }: { instructors: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      description: form.get("description") || null,
      instructorId: form.get("instructorId") || null,
      capacity: Number(form.get("capacity")),
      durationMin: Number(form.get("durationMin")),
      location: form.get("location") || null,
      color: selectedColor,
    };

    const res = await fetch("/api/classes", {
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
    (e.target as HTMLFormElement).reset();
    setSelectedColor(COLORS[0]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Νέο μάθημα</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Όνομα *</label>
        <input name="name" required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="π.χ. Yoga, Pilates, Spinning" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Διάρκεια (λεπτά) *</label>
          <input name="durationMin" type="number" min="10" defaultValue={60} required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Χωρητικότητα *</label>
          <input name="capacity" type="number" min="1" defaultValue={20} required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Γυμναστής</label>
        <select name="instructorId" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Χωρίς γυμναστή</option>
          {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Αίθουσα</label>
        <input name="location" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="π.χ. Αίθουσα Α" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Χρώμα</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${selectedColor === c ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
        {loading ? "Αποθήκευση..." : "Δημιουργία μαθήματος"}
      </button>
    </form>
  );
}
