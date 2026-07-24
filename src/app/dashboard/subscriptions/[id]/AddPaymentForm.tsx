"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddPaymentForm({
  subscriptionId,
  remaining,
  planPrice,
}: {
  subscriptionId: string;
  remaining: number;
  planPrice: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/subscriptions/${subscriptionId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(form.get("amount")),
        method: form.get("method"),
        notes: form.get("notes") || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Σφάλμα");
      return;
    }
    router.refresh();
  }

  const defaultAmount = remaining > 0 ? remaining.toFixed(2) : planPrice > 0 ? planPrice.toFixed(2) : "";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Καταχώρηση πληρωμής</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ποσό (€) *</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={defaultAmount}
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {remaining > 0 && (
          <p className="text-xs text-slate-400 mt-1">Υπόλοιπο: {remaining.toFixed(2)} €</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Τρόπος πληρωμής</label>
        <select name="method" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="CASH">Μετρητά</option>
          <option value="CARD">Κάρτα</option>
          <option value="BANK_TRANSFER">Τραπεζική μεταφορά</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Σημείωση</label>
        <input name="notes" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Προαιρετικό" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
        {loading ? "Αποθήκευση..." : "Καταχώρηση πληρωμής"}
      </button>
    </form>
  );
}
