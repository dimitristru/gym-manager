"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  member: { id: string; user: { name: string } };
  plan: { name: string; price: string };
  payments: { amount: string }[];
}

const statusLabel: Record<string, string> = {
  ACTIVE: "Ενεργή",
  EXPIRED: "Ληγμένη",
  CANCELLED: "Ανενεργή",
  PENDING: "Εκκρεμής",
};

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  EXPIRED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-100 text-red-600 hover:bg-red-200",
  PENDING: "bg-amber-100 text-amber-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(n: string | number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Number(n));
}

export default function SubscriptionsTable({ initialSubs }: { initialSubs: Subscription[] }) {
  const router = useRouter();
  const [subs, setSubs] = useState(initialSubs);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = subs.filter((s) =>
    s.member.user.name.toLowerCase().includes(search.toLowerCase()) ||
    s.plan.name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleStatus(sub: Subscription) {
    if (sub.status === "EXPIRED" || sub.status === "PENDING") return;
    const newStatus = sub.status === "ACTIVE" ? "CANCELLED" : "ACTIVE";
    setTogglingId(sub.id);
    const res = await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTogglingId(null);
    if (res.ok) {
      setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, status: newStatus } : s));
    }
  }

  async function deleteSub(id: string) {
    if (!confirm("Να διαγραφεί οριστικά η συνδρομή;")) return;
    setDeletingId(id);
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setSubs((prev) => prev.filter((s) => s.id !== id));
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Αναζήτηση μέλους ή πακέτου..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν συνδρομές ακόμα"}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΜΕΛΟΣ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΠΑΚΕΤΟ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΔΙΑΡΚΕΙΑ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΠΛΗΡΩΜΗ</th>
                <th className="text-left text-xs font-semibold text-slate-500 tracking-wider px-6 py-3.5">ΚΑΤΑΣΤΑΣΗ</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sub) => {
                const paid = sub.payments.reduce((s, p) => s + Number(p.amount), 0);
                const canToggle = sub.status === "ACTIVE" || sub.status === "CANCELLED";
                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {sub.member.user.name[0].toUpperCase()}
                        </div>
                        <Link href={`/dashboard/members/${sub.member.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                          {sub.member.user.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{sub.plan.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(sub.startDate)} — {formatDate(sub.endDate)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={paid >= Number(sub.plan.price) ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {formatCurrency(paid)}
                      </span>
                      <span className="text-slate-400"> / {formatCurrency(sub.plan.price)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(sub)}
                        disabled={!canToggle || togglingId === sub.id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusStyle[sub.status]} ${canToggle ? "cursor-pointer" : "cursor-default"} disabled:opacity-50`}
                        title={canToggle ? (sub.status === "ACTIVE" ? "Κλικ για απενεργοποίηση" : "Κλικ για ενεργοποίηση") : undefined}
                      >
                        {togglingId === sub.id ? "..." : statusLabel[sub.status]}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/dashboard/subscriptions/${sub.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Προβολή
                        </Link>
                        <button
                          onClick={() => deleteSub(sub.id)}
                          disabled={deletingId === sub.id}
                          className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Διαγραφή"
                        >
                          {deletingId === sub.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
