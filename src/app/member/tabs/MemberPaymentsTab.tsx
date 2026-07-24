"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionInfo } from "../MemberPortal";

export interface PlanInfo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number | null;
  isPersonalized: boolean;
}

export interface SubRequestInfo {
  id: string;
  type: "NEW" | "CANCEL_SUB";
  planName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const MONTHS_EL = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_EL[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtAmount(n: number) {
  return n.toLocaleString("el-GR", { style: "currency", currency: "EUR" });
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: "Ενεργή",    color: "#10b981", bg: "#10b98115" },
  EXPIRED:   { label: "Έληξε",     color: "#71717a", bg: "#71717a15" },
  CANCELLED: { label: "Ακυρώθηκε", color: "#ef4444", bg: "#ef444415" },
  PENDING:   { label: "Εκκρεμεί",  color: "#f97316", bg: "#f9731615" },
};

const REQ_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Εκκρεμεί",   color: "#f97316" },
  APPROVED: { label: "Εγκρίθηκε",  color: "#10b981" },
  REJECTED: { label: "Απορρίφθηκε", color: "#ef4444" },
};

export default function MemberPaymentsTab({
  memberId, subscriptions, plans, subscriptionRequests,
}: {
  memberId: string;
  subscriptions: SubscriptionInfo[];
  plans: PlanInfo[];
  subscriptionRequests: SubRequestInfo[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<
    | { type: "new"; planId: string; planName: string; price: number }
    | { type: "cancel"; subscriptionId: string; planName: string }
    | null
  >(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const active = subscriptions.filter((s) => s.status === "ACTIVE");
  const past = subscriptions.filter((s) => s.status !== "ACTIVE");
  const totalOutstanding = subscriptions.reduce((sum, s) => sum + s.outstanding, 0);
  const pendingSubReqs = subscriptionRequests.filter((r) => r.status === "PENDING");
  const hasPendingNew = pendingSubReqs.some((r) => r.type === "NEW");

  async function submit() {
    if (!modal) return;
    setSubmitting(true);
    setError("");
    const body =
      modal.type === "new"
        ? { memberId, type: "NEW", planId: modal.planId, note }
        : { memberId, type: "CANCEL_SUB", subscriptionId: modal.subscriptionId, note };
    const res = await fetch("/api/member/subscription-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) {
      setModal(null);
      setNote("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Σφάλμα");
    }
  }

  return (
    <div className="space-y-6">
      {/* Outstanding banner */}
      {totalOutstanding > 0 && (
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ backgroundColor: "#ef444410", border: "1px solid #ef444330" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#ef444420" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#ef4444">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Εκκρεμής υποχρέωση</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: "#ef4444" }}>{fmtAmount(totalOutstanding)}</p>
          </div>
        </div>
      )}

      {totalOutstanding === 0 && active.length > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: "#10b98110", border: "1px solid #10b98130" }}>
          <span className="text-lg">✓</span>
          <p className="text-sm font-semibold" style={{ color: "#10b981" }}>Δεν υπάρχουν εκκρεμείς οφειλές</p>
        </div>
      )}

      {/* Active subscriptions */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-3 tracking-wider" style={{ color: "#52525b" }}>ΕΝΕΡΓΕΣ ΣΥΝΔΡΟΜΕΣ</p>
          <div className="space-y-3">
            {active.map((sub) => {
              const paidPct = sub.total > 0 ? Math.min(100, Math.round((sub.paid / sub.total) * 100)) : 100;
              const hasPendingCancel = pendingSubReqs.some((r) => r.type === "CANCEL_SUB" && subscriptions.find((s) => s.id === sub.id));
              return (
                <div key={sub.id} className="rounded-2xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-white">{sub.planName}</p>
                      <p className="text-xs mt-1" style={{ color: "#71717a" }}>
                        Από {fmtDate(sub.startDate)}
                        {sub.isOngoing ? " · Επ' αόριστον" : sub.endDate ? ` έως ${fmtDate(sub.endDate)}` : ""}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ backgroundColor: STATUS_LABEL[sub.status]?.bg, color: STATUS_LABEL[sub.status]?.color }}>
                      {STATUS_LABEL[sub.status]?.label}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: "#71717a" }}>
                      <span>Πληρωμένο</span>
                      <span className="font-bold text-white">{paidPct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${paidPct}%`, backgroundColor: paidPct === 100 ? "#10b981" : "#f97316" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#1a1a1a" }}>
                      <p className="text-xs mb-1" style={{ color: "#71717a" }}>Σύνολο</p>
                      <p className="text-sm font-bold text-white">{fmtAmount(sub.total)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#10b98110" }}>
                      <p className="text-xs mb-1" style={{ color: "#71717a" }}>Πληρωμένο</p>
                      <p className="text-sm font-bold" style={{ color: "#10b981" }}>{fmtAmount(sub.paid)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: sub.outstanding > 0 ? "#ef444410" : "#1a1a1a" }}>
                      <p className="text-xs mb-1" style={{ color: "#71717a" }}>Υπόλοιπο</p>
                      <p className="text-sm font-bold" style={{ color: sub.outstanding > 0 ? "#ef4444" : "#52525b" }}>
                        {fmtAmount(sub.outstanding)}
                      </p>
                    </div>
                  </div>

                  {/* Cancel button */}
                  {hasPendingCancel ? (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#f97316" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-orange-400" />
                      Εκκρεμεί αίτημα ακύρωσης
                    </div>
                  ) : (
                    <button
                      onClick={() => { setModal({ type: "cancel", subscriptionId: sub.id, planName: sub.planName }); setNote(""); setError(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ backgroundColor: "#1e1e1e", color: "#ef4444", border: "1px solid #ef444430" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ef444415")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1e1e1e")}>
                      Αίτημα ακύρωσης συνδρομής
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New plan request */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold tracking-wider" style={{ color: "#52525b" }}>ΔΙΑΘΕΣΙΜΑ ΠΑΚΕΤΑ</p>
          {hasPendingNew && (
            <span className="text-xs flex items-center gap-1.5" style={{ color: "#f97316" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-orange-400" />
              Εκκρεμεί αίτημα
            </span>
          )}
        </div>
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl p-4 flex items-center gap-4"
              style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{plan.name}</p>
                {plan.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#71717a" }}>{plan.description}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "#52525b" }}>
                  {plan.durationDays ? `${Math.round(plan.durationDays / 30)} μήνες` : "Επ' αόριστον"}
                  {plan.isPersonalized ? " · Προσωποποιημένο" : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-black" style={{ color: "#f97316" }}>{fmtAmount(plan.price)}</p>
                <button
                  onClick={() => { setModal({ type: "new", planId: plan.id, planName: plan.name, price: plan.price }); setNote(""); setError(""); }}
                  disabled={hasPendingNew}
                  className="mt-1 text-xs px-3 py-1 rounded-lg font-semibold disabled:opacity-40 transition-all"
                  style={{ backgroundColor: "#f9731620", color: "#f97316", border: "1px solid #f9731640" }}
                  onMouseEnter={(e) => !hasPendingNew && (e.currentTarget.style.backgroundColor = "#f9731635")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9731620")}>
                  Αίτημα
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "#52525b" }}>Δεν υπάρχουν διαθέσιμα πακέτα</p>
          )}
        </div>
      </div>

      {/* Past subscriptions */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-3 tracking-wider" style={{ color: "#52525b" }}>ΙΣΤΟΡΙΚΟ ΣΥΝΔΡΟΜΩΝ</p>
          <div className="space-y-2">
            {past.map((sub) => (
              <div key={sub.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{sub.planName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>
                    {fmtDate(sub.startDate)}{sub.endDate ? ` — ${fmtDate(sub.endDate)}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{fmtAmount(sub.paid)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: STATUS_LABEL[sub.status]?.bg, color: STATUS_LABEL[sub.status]?.color }}>
                    {STATUS_LABEL[sub.status]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request history */}
      {subscriptionRequests.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-3 tracking-wider" style={{ color: "#52525b" }}>ΙΣΤΟΡΙΚΟ ΑΙΤΗΜΑΤΩΝ</p>
          <div className="space-y-2">
            {subscriptionRequests.map((r) => (
              <div key={r.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {r.type === "NEW" ? "Αίτημα νέου πακέτου" : "Αίτημα ακύρωσης"}
                    {r.planName && <span className="font-normal" style={{ color: "#71717a" }}> — {r.planName}</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{fmtDate(r.createdAt)}</p>
                  {r.reviewNote && <p className="text-xs mt-1 italic" style={{ color: "#71717a" }}>"{r.reviewNote}"</p>}
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: REQ_STATUS[r.status]?.color }}>
                  {REQ_STATUS[r.status]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subscriptions.length === 0 && subscriptionRequests.length === 0 && (
        <div className="text-center py-8" style={{ color: "#52525b" }}>Δεν υπάρχουν καταχωρημένες συνδρομές</div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
            <div>
              <h2 className="font-bold text-white text-lg">
                {modal.type === "new" ? "Αίτημα νέου πακέτου" : "Αίτημα ακύρωσης συνδρομής"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                {modal.type === "new"
                  ? `${modal.planName} — ${fmtAmount(modal.price)}`
                  : modal.planName}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                Σχόλιο <span style={{ color: "#52525b" }}>(προαιρετικό)</span>
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder={modal.type === "new" ? "π.χ. Θέλω να ξεκινήσω από..." : "π.χ. Λόγος ακύρωσης..."}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: modal.type === "cancel" ? "#ef4444" : "#f97316", color: "#fff" }}>
                {submitting ? "Αποστολή..." : "Υποβολή αιτήματος"}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
