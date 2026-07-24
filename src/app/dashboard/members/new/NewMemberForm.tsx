"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMemberForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
      dateOfBirth: form.get("dateOfBirth") || null,
      emergencyContact: form.get("emergencyContact") || null,
      notes: form.get("notes") || null,
    };

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Κάτι πήγε στραβά");
      return;
    }

    router.push(`/dashboard/members/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-6">
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ονοματεπώνυμο *</label>
          <input
            name="name"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Γιάννης Παπαδόπουλος"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="giannis@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Τηλέφωνο</label>
          <input
            name="phone"
            type="tel"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="69XXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Κωδικός πρόσβασης *</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Τουλάχιστον 6 χαρακτήρες"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ημερομηνία γέννησης</label>
          <input
            name="dateOfBirth"
            type="date"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Επαφή έκτακτης ανάγκης</label>
          <input
            name="emergencyContact"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Όνομα — 69XXXXXXXX"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Σημειώσεις</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Τραυματισμοί, ιδιαιτερότητες..."
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Ακύρωση
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {loading ? "Αποθήκευση..." : "Δημιουργία μέλους"}
        </button>
      </div>
    </form>
  );
}
