"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  price: string;
  maxClasses: number | null;
  isPersonalized: boolean;
  pricePerClass: string | null;
  isActive: boolean;
}

function formatCurrency(n: string | number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Number(n));
}

export default function PlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan> & { durationMonths?: number }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditData({ ...plan, durationMonths: plan.durationDays ? Math.round(plan.durationDays / 30) || 1 : undefined });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function savePlan() {
    if (!editingId) return;
    setSavingId(editingId);
    setSaveError(null);
    const res = await fetch(`/api/plans/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editData.name,
        description: editData.description || null,
        durationDays: editData.durationMonths ? editData.durationMonths * 30 : null,
        price: editData.isPersonalized ? 0 : Number(editData.price),
        maxClasses: editData.maxClasses ? Number(editData.maxClasses) : null,
        isPersonalized: !!editData.isPersonalized,
        pricePerClass: editData.isPersonalized ? Number(editData.pricePerClass) : null,
        isActive: editData.isActive,
      }),
    });
    setSavingId(null);
    if (res.ok) {
      const updated = await res.json();
      setPlans((prev) => prev.map((p) => p.id === editingId ? updated : p));
      setEditingId(null);
      setEditData({});
      setSaveError(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Σφάλμα αποθήκευσης");
    }
  }

  async function toggleActive(plan: Plan) {
    const res = await fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        price: plan.isPersonalized ? 0 : Number(plan.price),
        maxClasses: plan.maxClasses,
        isPersonalized: plan.isPersonalized,
        pricePerClass: plan.isPersonalized ? Number(plan.pricePerClass) : null,
        isActive: !plan.isActive,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans((prev) => prev.map((p) => p.id === plan.id ? updated : p));
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Να διαγραφεί οριστικά το πακέτο;")) return;
    setDeletingId(id);
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  if (plans.length === 0) {
    return <p className="text-sm text-slate-400">Δεν υπάρχουν πακέτα ακόμα.</p>;
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const isEditing = editingId === plan.id;

        if (isEditing) {
          return (
            <div key={plan.id} className="rounded-2xl border-2 border-blue-300 p-5 space-y-3">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-1">
                <button type="button" onClick={() => setEditData((d) => ({ ...d, isPersonalized: false }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${!editData.isPersonalized ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                  Σταθερό
                </button>
                <button type="button" onClick={() => setEditData((d) => ({ ...d, isPersonalized: true }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${editData.isPersonalized ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>
                  Προσωποποιημένο
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Όνομα</label>
                <input value={editData.name ?? ""} onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Περιγραφή</label>
                <input value={editData.description ?? ""} onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Προαιρετικό" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {editData.isPersonalized ? (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Τιμή ανά μάθημα (€)</label>
                    <input type="number" step="0.01" min="0" value={editData.pricePerClass ?? ""}
                      onChange={(e) => setEditData((d) => ({ ...d, pricePerClass: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Τιμή (€)</label>
                    <input type="number" step="0.01" min="0" value={editData.price ?? ""}
                      onChange={(e) => setEditData((d) => ({ ...d, price: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <div className={editData.isPersonalized ? "col-span-2" : ""}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600">Διάρκεια (μήνες)</label>
                    <button type="button"
                      onClick={() => setEditData((d) => ({ ...d, durationMonths: d.durationMonths === undefined ? 1 : undefined }))}
                      className={`text-xs px-2 py-0.5 rounded-lg border font-semibold transition-all ${editData.durationMonths === undefined ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                      Επ' αόριστον
                    </button>
                  </div>
                  {editData.durationMonths === undefined ? (
                    <div className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs text-orange-600 font-medium">Χωρίς λήξη</div>
                  ) : (
                    <input type="number" min="1" value={editData.durationMonths ?? ""}
                      onChange={(e) => setEditData((d) => ({ ...d, durationMonths: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
              </div>

              {!editData.isPersonalized && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Μέγιστα μαθήματα <span className="text-slate-400">(κενό = απεριόριστα)</span></label>
                  <input type="number" min="1" value={editData.maxClasses ?? ""}
                    onChange={(e) => setEditData((d) => ({ ...d, maxClasses: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="∞" />
                </div>
              )}

              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={savePlan} disabled={savingId === plan.id}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {savingId === plan.id ? "Αποθήκευση..." : "Αποθήκευση"}
                </button>
                <button onClick={cancelEdit}
                  className="px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
                  Ακύρωση
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={plan.id} className="rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{plan.name}</p>
                {plan.description && <p className="text-sm text-slate-500 mt-0.5">{plan.description}</p>}
                {plan.isPersonalized && (
                  <span className="inline-block mt-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Προσωποποιημένο</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => toggleActive(plan)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${plan.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {plan.isActive ? "Ενεργό" : "Ανενεργό"}
                </button>
                <button onClick={() => startEdit(plan)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => deletePlan(plan.id)} disabled={deletingId === plan.id}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Τιμή</p>
                <p className="text-lg font-bold text-slate-900">
                  {plan.isPersonalized ? `${formatCurrency(plan.pricePerClass ?? 0)}/μάθ.` : formatCurrency(plan.price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Διάρκεια</p>
                <p className="text-lg font-bold text-slate-900">
                  {plan.durationDays
                    ? `${Math.round(plan.durationDays / 30)} ${Math.round(plan.durationDays / 30) === 1 ? "μήνας" : "μήνες"}`
                    : "∞ Επ' αόριστον"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Μαθήματα</p>
                <p className="text-lg font-bold text-slate-900">{plan.isPersonalized ? "κατ' αθλητή" : (plan.maxClasses ?? "∞")}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
