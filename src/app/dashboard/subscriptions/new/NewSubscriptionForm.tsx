"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DAY_NAMES } from "@/lib/personalized";

interface Member { id: string; user: { name: string; email: string }; weeklyDays: string | null }
interface Plan { id: string; name: string; price: string | number; durationDays: number; maxClasses: number | null; isPersonalized: boolean; pricePerClass: string | number | null }

const MONTH_NAMES = ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];

export default function NewSubscriptionForm({ members, plans, defaultMemberId }: {
  members: Member[];
  plans: Plan[];
  defaultMemberId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(defaultMemberId ?? "");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [monthlyCost, setMonthlyCost] = useState<{ classCount: number; totalCost: number; days: number[] } | null>(null);
  const [calculating, setCalculating] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Auto-calculate when personalized plan + member + month selected
  useEffect(() => {
    if (!selectedPlan?.isPersonalized || !selectedMemberId || !selectedPlan.pricePerClass) {
      setMonthlyCost(null);
      return;
    }

    setCalculating(true);
    fetch(
      `/api/members/${selectedMemberId}/monthly-cost?year=${targetMonth.year}&month=${targetMonth.month}&pricePerClass=${selectedPlan.pricePerClass}`
    )
      .then((r) => r.json())
      .then((d) => { setMonthlyCost(d); setCalculating(false); })
      .catch(() => setCalculating(false));
  }, [selectedMemberId, selectedPlanId, targetMonth.year, targetMonth.month]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      memberId: selectedMemberId,
      planId: selectedPlanId,
      startDate: form.get("startDate"),
      paymentAmount: form.get("paymentAmount") ? Number(form.get("paymentAmount")) : null,
      paymentMethod: form.get("paymentMethod"),
      // For personalized: override price with calculated amount
      customPrice: selectedPlan?.isPersonalized && monthlyCost ? monthlyCost.totalCost : null,
    };

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Σφάλμα"); return; }
    router.push(`/dashboard/subscriptions/${data.id}`);
    router.refresh();
  }

  const today = new Date().toISOString().split("T")[0];

  // Month selector options: current + next 3 months
  const monthOptions = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  });

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-5">
      {/* Member */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Μέλος *</label>
        <select
          name="memberId"
          required
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Επίλεξε μέλος...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.user.name} — {m.user.email}</option>
          ))}
        </select>

        {/* Show member's weekly days if personalized plan selected */}
        {selectedMember && selectedPlan?.isPersonalized && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs">
            {selectedMember.weeklyDays ? (
              <>
                <span className="text-slate-500">Σταθερές μέρες: </span>
                <span className="font-medium text-slate-800">
                  {selectedMember.weeklyDays.split(",").map(Number).map((d) => DAY_NAMES[d]).join(", ")}
                </span>
              </>
            ) : (
              <span className="text-amber-600">
                ⚠ Δεν έχουν οριστεί σταθερές μέρες για αυτό το μέλος.{" "}
                <a href={`/dashboard/members/${selectedMember.id}/edit`} className="underline font-medium">Ορισμός →</a>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Plan */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Πακέτο *</label>
        {plans.length === 0 ? (
          <p className="text-sm text-amber-600">Δεν υπάρχουν πακέτα. <a href="/dashboard/subscriptions/plans" className="underline">Δημιούργησε πρώτα →</a></p>
        ) : (
          <select
            name="planId"
            required
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Επίλεξε πακέτο...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isPersonalized
                  ? ` — ${Number(p.pricePerClass).toFixed(2)}€/μάθημα`
                  : ` — ${Number(p.price).toFixed(2)}€ / ${p.durationDays} μέρες`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Personalized: month selector + calculation */}
      {selectedPlan?.isPersonalized && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-900">Υπολογισμός μηνιαίας συνδρομής</p>
            <select
              value={`${targetMonth.year}-${targetMonth.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setTargetMonth({ year: y, month: m });
              }}
              className="px-3 py-1.5 rounded-lg border border-blue-300 text-sm bg-white text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((o) => (
                <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{o.label}</option>
              ))}
            </select>
          </div>

          {calculating && <p className="text-sm text-blue-600">Υπολογισμός...</p>}

          {monthlyCost && !calculating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Μαθήματα τον μήνα:</span>
                <span className="font-semibold text-blue-900">{monthlyCost.classCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Τιμή ανά μάθημα:</span>
                <span className="font-semibold text-blue-900">{Number(selectedPlan.pricePerClass).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-blue-300 pt-2">
                <span className="text-blue-900">Σύνολο:</span>
                <span className="text-blue-900">{monthlyCost.totalCost.toFixed(2)}€</span>
              </div>
            </div>
          )}

          {!monthlyCost && !calculating && selectedMemberId && (
            <p className="text-sm text-amber-700">Ορίσε σταθερές μέρες στο προφίλ του μέλους για να γίνει ο υπολογισμός.</p>
          )}
        </div>
      )}

      {/* Start date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ημερομηνία έναρξης *</label>
        <input name="startDate" type="date" required defaultValue={today} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Payment */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-sm font-semibold text-slate-700 mb-4">Πληρωμή (προαιρετικό)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ποσό (€)</label>
            <input
              name="paymentAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={monthlyCost ? monthlyCost.totalCost.toFixed(2) : ""}
              key={monthlyCost?.totalCost}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Τρόπος πληρωμής</label>
            <select name="paymentMethod" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="CASH">Μετρητά</option>
              <option value="CARD">Κάρτα</option>
              <option value="BANK_TRANSFER">Τραπεζική μεταφορά</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Ακύρωση
        </button>
        <button type="submit" disabled={loading || plans.length === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {loading ? "Αποθήκευση..." : "Δημιουργία συνδρομής"}
        </button>
      </div>
    </form>
  );
}
