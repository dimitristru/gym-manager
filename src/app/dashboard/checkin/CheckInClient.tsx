"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface ScheduledEntry {
  key: string;
  memberId: string;
  memberName: string;
  time: string;
  type: "recurring" | "reservation";
  reservationId: string | null;
}
interface MemberInfo {
  id: string;
  name: string;
  fullName: string;
  email: string;
}
interface CheckInRecord {
  id: string;
  memberId: string;
  time: string;
  checkedAt: string;
}

export default function CheckInClient({
  scheduled, allMembers, checkInsToday: initialCheckIns, todayISO, dateLabel,
}: {
  scheduled: ScheduledEntry[];
  allMembers: MemberInfo[];
  checkInsToday: CheckInRecord[];
  todayISO: string;
  dateLabel: string;
}) {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(initialCheckIns);
  const [walkInSearch, setWalkInSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const checkedMemberIds = new Set(checkIns.map((c) => c.memberId));
  const checkedCount = checkIns.length;
  const totalScheduled = scheduled.length;
  const absentCount = totalScheduled - scheduled.filter((s) => checkedMemberIds.has(s.memberId)).length;

  async function doCheckIn(memberId: string, time: string) {
    if (checkedMemberIds.has(memberId)) return;
    setLoading(memberId);
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, date: todayISO, time }),
    });
    if (res.ok) {
      const created = await res.json();
      setCheckIns((prev) => [...prev, { id: created.id, memberId: created.memberId, time: created.time, checkedAt: created.checkedAt }]);
    }
    setLoading(null);
  }

  async function undoCheckIn(memberId: string) {
    const ci = checkIns.find((c) => c.memberId === memberId);
    if (!ci) return;
    setLoading(memberId);
    await fetch(`/api/checkins/${ci.id}`, { method: "DELETE" });
    setCheckIns((prev) => prev.filter((c) => c.id !== ci.id));
    setLoading(null);
  }

  const walkInResults = walkInSearch.length > 0
    ? allMembers.filter((m) =>
        (m.name.toLowerCase().includes(walkInSearch.toLowerCase()) ||
         m.fullName.toLowerCase().includes(walkInSearch.toLowerCase()) ||
         m.email.toLowerCase().includes(walkInSearch.toLowerCase()))
      ).slice(0, 6)
    : [];

  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Check-In</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">{dateLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#10b98115", border: "1px solid #10b98130" }}>
          <p className="text-3xl font-black" style={{ color: "#10b981" }}>{checkedCount}</p>
          <p className="text-xs font-semibold mt-1" style={{ color: "#10b981" }}>Παρών</p>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#3b82f615", border: "1px solid #3b82f630" }}>
          <p className="text-3xl font-black" style={{ color: "#3b82f6" }}>{totalScheduled}</p>
          <p className="text-xs font-semibold mt-1" style={{ color: "#3b82f6" }}>Προγραμματισμένοι</p>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: absentCount > 0 ? "#f5950015" : "#1a1a1a", border: `1px solid ${absentCount > 0 ? "#f5950030" : "#2a2a2a"}` }}>
          <p className="text-3xl font-black" style={{ color: absentCount > 0 ? "#f59e0b" : "#52525b" }}>{absentCount}</p>
          <p className="text-xs font-semibold mt-1" style={{ color: absentCount > 0 ? "#f59e0b" : "#52525b" }}>Αναμένονται</p>
        </div>
      </div>

      {/* Scheduled members */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #1e1e1e" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#141414" }}>
          <h2 className="font-semibold text-white">Προγραμματισμένοι σήμερα</h2>
        </div>

        {scheduled.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">Κανείς δεν έχει πρόγραμμα σήμερα</div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {scheduled.map((entry) => {
              const checked = checkedMemberIds.has(entry.memberId);
              const checkIn = checkIns.find((c) => c.memberId === entry.memberId);
              const isLoading = loading === entry.memberId;
              const isPast = entry.time < currentTimeStr;

              return (
                <div key={entry.key} className="flex items-center gap-4 px-5 py-3.5" style={{ backgroundColor: checked ? "#10b98108" : "transparent" }}>
                  {/* Time */}
                  <div className="w-14 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: checked ? "#10b981" : isPast ? "#f59e0b" : "#a1a1aa" }}>
                      {entry.time}
                    </span>
                  </div>

                  {/* Type dot */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.type === "recurring" ? "#10b981" : "#f59e0b" }} />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/members/${entry.memberId}`}
                      className="text-sm font-semibold hover:underline"
                      style={{ color: checked ? "#10b981" : "#f4f4f5" }}>
                      {entry.memberName}
                    </Link>
                    {checkIn && (
                      <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                        Check-in {new Date(checkIn.checkedAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  {checked ? (
                    <button
                      onClick={() => undoCheckIn(entry.memberId)}
                      disabled={!!isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "#10b98120", color: "#10b981" }}
                      title="Αναίρεση check-in"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Παρών
                    </button>
                  ) : (
                    <button
                      onClick={() => doCheckIn(entry.memberId, entry.time)}
                      disabled={!!isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#f97316";
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                        (e.currentTarget as HTMLElement).style.border = "1px solid #f97316";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e";
                        (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
                        (e.currentTarget as HTMLElement).style.border = "1px solid #2a2a2a";
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Check-In
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Walk-in section */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#141414" }}>
          <h2 className="font-semibold text-white">Walk-in</h2>
          <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Μέλος χωρίς προγραμματισμένη ώρα σήμερα</p>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#52525b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Αναζήτηση μέλους..."
              value={walkInSearch}
              onChange={(e) => setWalkInSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            />
          </div>

          {walkInResults.length > 0 && (
            <div className="space-y-1">
              {walkInResults.map((m) => {
                const checked = checkedMemberIds.has(m.id);
                const checkIn = checkIns.find((c) => c.memberId === m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#141414" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "#f9731620", color: "#f97316" }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#f4f4f5" }}>{m.name}</p>
                      {checkIn ? (
                        <p className="text-xs" style={{ color: "#10b981" }}>
                          ✓ Check-in {new Date(checkIn.checkedAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : (
                        <p className="text-xs truncate" style={{ color: "#52525b" }}>{m.email}</p>
                      )}
                    </div>
                    {checked ? (
                      <button onClick={() => undoCheckIn(m.id)} disabled={loading === m.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: "#10b98120", color: "#10b981" }}>
                        Παρών ✓
                      </button>
                    ) : (
                      <button onClick={() => doCheckIn(m.id, currentTimeStr)} disabled={loading === m.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ backgroundColor: "#f97316", color: "#fff" }}>
                        Check-In
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {walkInSearch.length > 0 && walkInResults.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "#52525b" }}>Δεν βρέθηκε μέλος</p>
          )}
        </div>
      </div>
    </div>
  );
}
