"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [isOngoing, setIsOngoing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      description: form.get("description") || null,
      durationDays: isOngoing ? null : Number(form.get("durationMonths")) * 30,
      price: isPersonalized ? 0 : Number(form.get("price")),
      maxClasses: form.get("maxClasses") ? Number(form.get("maxClasses")) : null,
      isPersonalized,
      pricePerClass: isPersonalized ? Number(form.get("pricePerClass")) : null,
    };

    const res = await fetch("/api/plans", {
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
    setIsPersonalized(false);
    setIsOngoing(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Νέο πακέτο</h2>

      {/* Type toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setIsPersonalized(false)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isPersonalized ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Σταθερό
        </button>
        <button
          type="button"
          onClick={() => setIsPersonalized(true)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isPersonalized ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Προσωποποιημένο
        </button>
      </div>

      {isPersonalized && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          Η τιμή υπολογίζεται αυτόματα βάσει των σταθερών ημερών του αθλητή και της τιμής ανά μάθημα.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Όνομα *</label>
        <input name="name" required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isPersonalized ? "π.χ. Προσωποποιημένο" : "π.χ. Μηνιαία συνδρομή"} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Περιγραφή</label>
        <input name="description" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Προαιρετικό" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isPersonalized ? (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Τιμή ανά μάθημα (€) *</label>
            <input name="pricePerClass" type="number" step="0.01" min="0" required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="π.χ. 8.00" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Τιμή (€) *</label>
            <input name="price" type="number" step="0.01" min="0" required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="50.00" />
          </div>
        )}
        <div className={isPersonalized ? "col-span-2" : ""}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Διάρκεια (μήνες) *</label>
            <button
              type="button"
              onClick={() => setIsOngoing((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${isOngoing ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"}`}
            >
              <span className={`w-2 h-2 rounded-full ${isOngoing ? "bg-orange-500" : "bg-slate-300"}`} />
              Επ' αόριστον
            </button>
          </div>
          {isOngoing ? (
            <div className="px-3.5 py-2.5 rounded-lg border border-orange-200 bg-orange-50 text-sm text-orange-600 font-medium">
              Χωρίς λήξη — ισχύει μέχρι ακύρωσης
            </div>
          ) : (
            <input name="durationMonths" type="number" min="1" required defaultValue={1} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
        </div>
      </div>

      {!isPersonalized && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Μέγιστα μαθήματα <span className="text-slate-400">(κενό = απεριόριστα)</span></label>
          <input name="maxClasses" type="number" min="1" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="π.χ. 12" />
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
        {loading ? "Αποθήκευση..." : "Δημιουργία πακέτου"}
      </button>
    </form>
  );
}
