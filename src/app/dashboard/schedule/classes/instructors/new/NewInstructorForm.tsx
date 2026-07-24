"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInstructorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      specialty: form.get("specialty") || null,
    };

    const res = await fetch("/api/instructors", {
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

    router.push("/dashboard/schedule/classes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ονοματεπώνυμο *</label>
        <input
          name="name"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Μαρία Κωστοπούλου"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ειδικότητα</label>
        <input
          name="specialty"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="π.χ. Yoga, Pilates, CrossFit"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input
          name="email"
          type="email"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="maria@gym.local"
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
          {loading ? "Αποθήκευση..." : "Δημιουργία γυμναστή"}
        </button>
      </div>
    </form>
  );
}
