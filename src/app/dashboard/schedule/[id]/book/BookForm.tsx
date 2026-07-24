"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookForm({
  sessionId,
  members,
}: {
  sessionId: string;
  members: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: sessionId, memberId: form.get("memberId") }),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Σφάλμα");
      return;
    }

    router.push(`/dashboard/schedule/${sessionId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Μέλος *</label>
        {members.length === 0 ? (
          <p className="text-sm text-slate-400">Όλα τα μέλη έχουν ήδη κράτηση σε αυτό το μάθημα.</p>
        ) : (
          <select name="memberId" required defaultValue="" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="" disabled>Επίλεξε μέλος...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {m.email}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Ακύρωση
        </button>
        <button type="submit" disabled={loading || members.length === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {loading ? "Αποθήκευση..." : "Καταχώρηση κράτησης"}
        </button>
      </div>
    </form>
  );
}
