"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  schedule: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    fillRate: number;
    totalCancellations: number;
    lateCancellations: number;
    reschedules: number;
    workDays: number;
    memberScheduled: number | null;
    memberAttendanceRate: number | null;
  };
  financial: {
    subscriptionTotal: number;
    subscriptionPaid: number;
    subscriptionOutstanding: number;
    personalizedRevenue: number;
    periodPaid: number;
    subscriptionCount: number;
    breakdown: {
      id: string;
      memberName: string;
      planName: string;
      total: number;
      paid: number;
      outstanding: number;
      startDate: string;
      endDate: string | null;
    }[];
  };
}

interface MonthOption {
  label: string;
  from: string;
  to: string;
}

interface MemberInfo {
  id: string;
  name: string;
  fullName: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function StatCard({ label, value, sub, color, big }: { label: string; value: string | number; sub?: string; color?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
      <p className="text-[11px] font-semibold tracking-wider" style={{ color: "#52525b" }}>{label}</p>
      <p className={`font-black leading-none ${big ? "text-4xl" : "text-3xl"}`} style={{ color: color ?? "#f4f4f5" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{sub}</p>}
    </div>
  );
}

function BarFill({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

const PRESETS = [
  { label: "Σήμερα", getValue: () => { const t = today(); return { from: t, to: t }; } },
  { label: "Last 7 days", getValue: () => { const t = today(); return { from: addDays(t, -6), to: t }; } },
  { label: "Last 30 days", getValue: () => { const t = today(); return { from: addDays(t, -29), to: t }; } },
  { label: "Last week", getValue: () => { const t = new Date(); const dow = t.getDay() || 7; const mon = addDays(today(), -(dow - 1) - 7); return { from: mon, to: addDays(mon, 6) }; } },
  { label: "YTD", getValue: () => { const t = today(); return { from: `${t.slice(0, 4)}-01-01`, to: t }; } },
  { label: "Last year", getValue: () => { const y = new Date().getFullYear() - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; } },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function StatsClient({
  stats, members, monthOptions, fromStr, toStr,
  selectedMemberId, selectedMemberName, periodLabel,
}: {
  stats: Stats;
  members: MemberInfo[];
  monthOptions: MonthOption[];
  fromStr: string;
  toStr: string;
  selectedMemberId: string | null;
  selectedMemberName: string | null;
  periodLabel: string;
}) {
  const router = useRouter();
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberList, setShowMemberList] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(fromStr);
  const [customTo, setCustomTo] = useState(toStr);

  function navigate(from: string, to: string, memberId: string | null) {
    const params = new URLSearchParams({ from, to });
    if (memberId) params.set("memberId", memberId);
    router.push(`/dashboard/stats?${params}`);
  }

  const filteredMembers = memberSearch.length > 0
    ? members.filter((m) =>
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase())
      ).slice(0, 8)
    : members.slice(0, 8);

  const { schedule: s, financial: f } = stats;

  // Detect if current range matches a month option
  const activeMonth = monthOptions.find((o) => o.from === fromStr && o.to === toStr);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Στατιστικά</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{periodLabel}{selectedMemberName ? ` · ${selectedMemberName}` : " · Όλοι οι αθλητές"}</p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-8">

        {/* Row 1: Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => {
            const { from, to } = p.getValue();
            const active = fromStr === from && toStr === to;
            return (
              <button
                key={p.label}
                onClick={() => { setShowCustom(false); navigate(from, to, selectedMemberId); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? "#f97316" : "#141414",
                  color: active ? "#fff" : "#a1a1aa",
                  border: `1px solid ${active ? "#f97316" : "#2a2a2a"}`,
                }}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: showCustom ? "#f9731620" : "#141414",
              color: showCustom ? "#f97316" : "#a1a1aa",
              border: `1px solid ${showCustom ? "#f9731640" : "#2a2a2a"}`,
            }}
          >
            Προσαρμοσμένο
          </button>
        </div>

        {/* Custom date range */}
        {showCustom && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            />
            <span style={{ color: "#52525b" }}>→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            />
            <button
              onClick={() => { navigate(customFrom, customTo, selectedMemberId); setShowCustom(false); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "#f97316", color: "#fff" }}
            >
              Εφαρμογή
            </button>
          </div>
        )}

        {/* Row 2: Month selector + Member selector */}
        <div className="flex gap-3 flex-wrap">
          {/* Month selector */}
          <select
            value={activeMonth ? `${activeMonth.from}|${activeMonth.to}` : ""}
            onChange={(e) => {
              if (!e.target.value) return;
              const [from, to] = e.target.value.split("|");
              setShowCustom(false);
              navigate(from, to, selectedMemberId);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
            style={{ backgroundColor: "#141414", border: `1px solid ${activeMonth ? "#f9731640" : "#2a2a2a"}`, color: activeMonth ? "#f97316" : "#f4f4f5" }}
          >
            <option value="">Επιλογή μήνα...</option>
            {monthOptions.map((o) => (
              <option key={`${o.from}|${o.to}`} value={`${o.from}|${o.to}`}>{o.label}</option>
            ))}
          </select>

          {/* Member selector */}
          <div className="relative flex-1 min-w-[200px]">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ backgroundColor: selectedMemberId ? "#f9731620" : "#141414", border: `1px solid ${selectedMemberId ? "#f9731640" : "#2a2a2a"}`, color: selectedMemberId ? "#f97316" : "#a1a1aa" }}
              onClick={() => setShowMemberList(!showMemberList)}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="flex-1 truncate">{selectedMemberName ?? "Όλοι οι αθλητές"}</span>
              {selectedMemberId && (
                <button onClick={(e) => { e.stopPropagation(); navigate(fromStr, toStr, null); setMemberSearch(""); }}
                  className="text-orange-400 hover:text-orange-200 ml-1">×</button>
              )}
            </div>

            {showMemberList && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden shadow-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
                <div className="p-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Αναζήτηση..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
                  />
                </div>
                <button
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors"
                  style={{ color: !selectedMemberId ? "#f97316" : "#a1a1aa" }}
                  onClick={() => { navigate(fromStr, toStr, null); setShowMemberList(false); setMemberSearch(""); }}
                >
                  Όλοι οι αθλητές
                </button>
                <div className="border-t" style={{ borderColor: "#1e1e1e" }} />
                <div className="max-h-48 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <button key={m.id}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors"
                      style={{ color: selectedMemberId === m.id ? "#f97316" : "#f4f4f5" }}
                      onClick={() => { navigate(fromStr, toStr, m.id); setShowMemberList(false); setMemberSearch(""); }}
                    >
                      {m.name}
                      {m.name !== m.fullName && <span className="text-xs ml-1.5" style={{ color: "#52525b" }}>({m.fullName})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Schedule ─────────────────────────────────────── */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
          <span className="text-xs font-bold tracking-widest" style={{ color: "#52525b" }}>Προγραμματισμός</span>
          <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
        </div>
      </div>

      {/* Fill rate visual */}
      <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider" style={{ color: "#52525b" }}>Πλήρωση Slots</p>
            <p className="text-5xl font-black mt-1" style={{ color: s.fillRate >= 80 ? "#10b981" : s.fillRate >= 50 ? "#f97316" : "#f4f4f5" }}>
              {selectedMemberId && s.memberAttendanceRate !== null ? `${s.memberAttendanceRate}%` : `${s.fillRate}%`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>
              {selectedMemberId ? `${s.filledSlots} / ${s.memberScheduled ?? "—"}` : `${s.filledSlots} / ${s.totalSlots}`}
            </p>
            <p className="text-xs" style={{ color: "#52525b" }}>
              {selectedMemberId ? "παρουσίες / προγραμματισμένες" : `παρουσίες / ${s.workDays} εργάσιμες × ${13 * 2} slots`}
            </p>
          </div>
        </div>
        <BarFill
          pct={selectedMemberId && s.memberAttendanceRate !== null ? s.memberAttendanceRate : s.fillRate}
          color={s.fillRate >= 80 ? "#10b981" : s.fillRate >= 50 ? "#f97316" : "#3b82f6"}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {!selectedMemberId && (
          <StatCard label="Συνολικά Slots" value={s.totalSlots} sub={`${s.workDays} εργ. ημέρες × 26 slots`} />
        )}
        <StatCard label="Booked" value={s.filledSlots} color="#10b981" sub="check-ins" />
        {!selectedMemberId && (
          <StatCard label="Unbooked" value={s.emptySlots} color="#52525b" sub="αναξιοποίητα" />
        )}
        {selectedMemberId && s.memberScheduled !== null && (
          <StatCard label="Προγραμ/μένες" value={s.memberScheduled} sub="αυτή την περίοδο" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard label="Ακυρώσεις" value={s.totalCancellations - s.reschedules} color={s.totalCancellations > 0 ? "#f59e0b" : "#52525b"} sub="σύνολο" />
        <StatCard label="Last minute (<5h)" value={s.lateCancellations} color={s.lateCancellations > 0 ? "#ef4444" : "#52525b"} sub="χρεώνονται" />
        <StatCard label="Αλλαγές ημ/νίας" value={s.reschedules} color={s.reschedules > 0 ? "#7c3aed" : "#52525b"} sub="μεταφορές" />
      </div>

      {/* ── Section 2: Financial ────────────────────────────────────── */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
          <span className="text-xs font-bold tracking-widest" style={{ color: "#52525b" }}>Λογιστικά</span>
          <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
        </div>
      </div>

      {/* Fixed subscription progress */}
      {f.subscriptionTotal > 0 && (
        <>
          <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wider" style={{ color: "#52525b" }}>Εξόφληση συνδρομής</p>
                <p className="text-5xl font-black mt-1" style={{ color: "#10b981" }}>
                  {`${Math.round((f.subscriptionPaid / f.subscriptionTotal) * 100)}%`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>{fmt(f.subscriptionPaid)} € / {fmt(f.subscriptionTotal)} €</p>
                <p className="text-xs" style={{ color: "#52525b" }}>
                  {f.subscriptionCount} {f.subscriptionCount === 1 ? "συνδρομή" : "συνδρομές"}
                </p>
              </div>
            </div>
            <BarFill pct={(f.subscriptionPaid / f.subscriptionTotal) * 100} color="#10b981" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Σύνολο" value={`${fmt(f.subscriptionTotal)} €`} sub="αξία συνδρομής" color="#3b82f6" />
            <StatCard label="Έχει πληρώσει" value={`${fmt(f.subscriptionPaid)} €`} sub="συνολικές δόσεις" color="#10b981" />
            <StatCard label="Υπόλοιπο" value={`${fmt(f.subscriptionOutstanding)} €`} sub="προς εξόφληση" color={f.subscriptionOutstanding > 0 ? "#f59e0b" : "#52525b"} />
          </div>
        </>
      )}

      {/* Personalized plan (per-session) */}
      {f.personalizedRevenue > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <StatCard label="Αναμενόμενο (περίοδος)" value={`${fmt(f.personalizedRevenue)} €`} sub="βάσει μαθημάτων" color="#3b82f6" />
          <StatCard label="Πληρώθηκε (περίοδος)" value={`${fmt(f.periodPaid)} €`} sub="πληρωμές" color="#10b981" />
        </div>
      )}

      {/* Breakdown per subscription */}
      {f.breakdown.length > 0 && (
        <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
          <div className="px-5 py-3" style={{ backgroundColor: "#141414", borderBottom: "1px solid #1e1e1e" }}>
            <p className="text-xs font-bold tracking-wider" style={{ color: "#52525b" }}>Ανάλυση συνδρομών</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {f.breakdown.map((s) => {
              const pct = s.total > 0 ? (s.paid / s.total) * 100 : 0;
              return (
                <div key={s.id} className="px-5 py-4" style={{ backgroundColor: "#0f0f0f" }}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      {!selectedMemberId && (
                        <p className="text-sm font-semibold truncate" style={{ color: "#f4f4f5" }}>{s.memberName}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                        {s.planName} · {s.startDate} → {s.endDate ?? "∞"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: s.outstanding > 0 ? "#f59e0b" : "#10b981" }}>
                        {fmt(s.paid)} / {fmt(s.total)} €
                      </p>
                      {s.outstanding > 0 && (
                        <p className="text-xs" style={{ color: "#ef4444" }}>−{fmt(s.outstanding)} €</p>
                      )}
                    </div>
                  </div>
                  <BarFill pct={pct} color={pct >= 100 ? "#10b981" : pct >= 50 ? "#f97316" : "#3b82f6"} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
