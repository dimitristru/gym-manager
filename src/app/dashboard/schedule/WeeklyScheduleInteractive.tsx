"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import MemberFilter from "./MemberFilter";

const DAY_NAMES = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9);
const SLOT_CAPACITY = 2;

interface Schedule {
  id: string;
  startsAt: string;
  endsAt: string;
  isCancelled: boolean;
  class: { id: string; name: string; color: string | null; capacity: number; instructor: { name: string } | null };
  bookings: { id: string; memberName: string }[];
}

interface RecurringSlot {
  memberId: string;
  memberName: string;
  day: number;
  time: string;
}

interface Reservation {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  time: string;
}

interface MemberInfo {
  id: string;
  name: string;
  slots: { day: number; time: string }[];
}

type DragState =
  | { kind: "recurring"; memberId: string; memberName: string; fromDay: number; fromTime: string }
  | { kind: "reservation"; id: string; memberId: string; memberName: string; date: string; time: string };

export default function WeeklyScheduleInteractive({
  schedules, monday, initialSlots, initialReservations, members, pendingKeys = [],
}: {
  schedules: Schedule[];
  monday: string;
  initialSlots: RecurringSlot[];
  initialReservations: Reservation[];
  members: MemberInfo[];
  pendingKeys?: string[];
}) {
  const pendingSet = new Set(pendingKeys);
  const mondayDate = new Date(monday);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    return d;
  });

  const [slots, setSlots] = useState<RecurringSlot[]>(initialSlots);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [memberMap, setMemberMap] = useState<Record<string, { day: number; time: string }[]>>(
    () => Object.fromEntries(members.map((m) => [m.id, m.slots]))
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [modal, setModal] = useState<{ dayIdx: number; hour: number } | null>(null);
  const [bookingType, setBookingType] = useState<"recurring" | "once">("recurring");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── helpers ───────────────────────────────────────────────────────
  const getSessions = (dayIdx: number, hour: number) =>
    schedules.filter((s) => {
      const d = new Date(s.startsAt);
      return d.getDate() === days[dayIdx].getDate() && d.getMonth() === days[dayIdx].getMonth() && d.getHours() === hour;
    });
  const getSlots = (dayIdx: number, hour: number) =>
    slots.filter((s) => s.day === dayIdx + 1 && parseInt(s.time) === hour && (!filterMemberId || s.memberId === filterMemberId));
  const getReservations = (dayIdx: number, hour: number) =>
    reservations.filter((r) => {
      const d = new Date(r.date);
      return d.getDate() === days[dayIdx].getDate() && d.getMonth() === days[dayIdx].getMonth() && parseInt(r.time) === hour && (!filterMemberId || r.memberId === filterMemberId);
    });

  async function patchSlots(memberId: string, newSlots: { day: number; time: string }[]) {
    await fetch(`/api/members/${memberId}/slots`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: newSlots }),
    });
  }

  // ── drag & drop ───────────────────────────────────────────────────
  // Dragging a recurring slot creates a ONE-TIME reservation for this week's date.
  // The permanent weeklyDays schedule is NOT modified — it stays for future weeks.
  function onDragStart(slot: RecurringSlot) {
    setDragState({ kind: "recurring", memberId: slot.memberId, memberName: slot.memberName, fromDay: slot.day, fromTime: slot.time });
  }
  function onDragStartReservation(res: Reservation) {
    setDragState({ kind: "reservation", id: res.id, memberId: res.memberId, memberName: res.memberName, date: res.date, time: res.time });
  }
  function onDragEnd() { setDragState(null); setDragOver(null); }

  async function onDrop(dayIdx: number, hour: number) {
    if (!dragState) return;
    setDragOver(null);
    const newDay = dayIdx + 1;
    const newTime = `${String(hour).padStart(2, "0")}:00`;
    const targetDate = days[dayIdx];
    const dateISO = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();

    if (dragState.kind === "recurring") {
      if (dragState.fromDay === newDay && dragState.fromTime === newTime) { setDragState(null); return; }
      // Remove this week's occurrence (weeklyDays stays intact → future weeks still show)
      setSlots((prev) => prev.filter(
        (s) => !(s.memberId === dragState.memberId && s.day === dragState.fromDay && s.time === dragState.fromTime)
      ));
      const res = await fetch("/api/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: dragState.memberId, date: dateISO, time: newTime }),
      });
      if (res.ok) { const created = await res.json(); setReservations((prev) => [...prev, created]); }
    } else {
      // Reservation drag → move to new date/time
      const existingDate = new Date(dragState.date);
      const existingDateISO = new Date(existingDate.getFullYear(), existingDate.getMonth(), existingDate.getDate()).toISOString();
      if (existingDateISO === dateISO && dragState.time === newTime) { setDragState(null); return; }
      setReservations((prev) => prev.map((r) =>
        r.id === dragState.id ? { ...r, date: dateISO, time: newTime } : r
      ));
      await fetch(`/api/reservations/${dragState.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateISO, time: newTime }),
      });
    }
    setDragState(null);
  }

  // ── remove ────────────────────────────────────────────────────────
  async function removeSlot(slot: RecurringSlot) {
    setSlots((prev) => prev.filter((s) => !(s.memberId === slot.memberId && s.day === slot.day && s.time === slot.time)));
    const updated = (memberMap[slot.memberId] ?? []).filter((s) => !(s.day === slot.day && s.time === slot.time));
    setMemberMap((prev) => ({ ...prev, [slot.memberId]: updated }));
    await patchSlots(slot.memberId, updated);
  }
  async function removeReservation(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
  }

  // ── convert type ──────────────────────────────────────────────────
  async function convertSlotToReservation(slot: RecurringSlot, dayIdx: number) {
    // Only hide this week's occurrence — weeklyDays stays intact for future weeks
    setSlots((prev) => prev.filter((s) => !(s.memberId === slot.memberId && s.day === slot.day && s.time === slot.time)));
    const targetDate = days[dayIdx];
    const dateISO = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();
    const res = await fetch("/api/reservations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: slot.memberId, date: dateISO, time: slot.time }),
    });
    if (res.ok) {
      const created = await res.json();
      setReservations((prev) => [...prev, created]);
    }
  }

  async function convertReservationToSlot(res: Reservation, dayIdx: number) {
    // Delete reservation
    await fetch(`/api/reservations/${res.id}`, { method: "DELETE" });
    setReservations((prev) => prev.filter((r) => r.id !== res.id));
    // Add to recurring
    const newDay = dayIdx + 1;
    const current = memberMap[res.memberId] ?? [];
    const updated = [...current.filter((s) => s.day !== newDay), { day: newDay, time: res.time }];
    setMemberMap((prev) => ({ ...prev, [res.memberId]: updated }));
    setSlots((prev) => [...prev.filter((s) => !(s.memberId === res.memberId && s.day === newDay)),
      { memberId: res.memberId, memberName: res.memberName, day: newDay, time: res.time }]);
    await patchSlots(res.memberId, updated);
  }

  // ── add member ────────────────────────────────────────────────────
  function openModal(dayIdx: number, hour: number) {
    setModal({ dayIdx, hour });
    setBookingType("recurring");
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  async function addMember(member: MemberInfo) {
    if (!modal) return;
    setSaving(true);
    const newTime = `${String(modal.hour).padStart(2, "0")}:00`;
    const newDay = modal.dayIdx + 1;

    if (bookingType === "recurring") {
      setSlots((prev) => [...prev.filter((s) => !(s.memberId === member.id && s.day === newDay)),
        { memberId: member.id, memberName: member.name, day: newDay, time: newTime }]);
      const updated = [...(memberMap[member.id] ?? []).filter((s) => s.day !== newDay), { day: newDay, time: newTime }];
      setMemberMap((prev) => ({ ...prev, [member.id]: updated }));
      await patchSlots(member.id, updated);
    } else {
      const targetDate = days[modal.dayIdx];
      const dateISO = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();
      const res = await fetch("/api/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, date: dateISO, time: newTime }),
      });
      if (res.ok) { const created = await res.json(); setReservations((prev) => [...prev, created]); }
    }
    setSaving(false);
    setModal(null);
  }

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  // ── card render helpers (called as functions, not components, to avoid unmount during drag) ──
  function renderSlotCard(slot: RecurringSlot, dayIdx: number) {
    return (
      <div
        key={`slot-${slot.memberId}-${slot.time}`}
        data-card
        draggable
        onDragStart={() => onDragStart(slot)}
        onDragEnd={onDragEnd}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 cursor-grab active:cursor-grabbing group/card flex-shrink-0 max-w-full"
        style={{ backgroundColor: "#10b98118", borderLeft: "2px solid #10b981" }}
        title={slot.memberName}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        <Link href={`/dashboard/members/${slot.memberId}`} onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-emerald-800 truncate max-w-[80px]">
          {slot.memberName}
        </Link>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-all flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); convertSlotToReservation(slot, dayIdx); }}
            className="text-slate-400 hover:text-amber-500 transition-colors" title="→ Κράτηση">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeSlot(slot); }}
            className="text-slate-400 hover:text-red-500 transition-colors" title="Αφαίρεση">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  function renderReservationCard(res: Reservation, dayIdx: number) {
    return (
      <div
        key={`res-${res.id}`}
        data-card
        draggable
        onDragStart={() => onDragStartReservation(res)}
        onDragEnd={onDragEnd}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 group/card flex-shrink-0 max-w-full cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: "#f59e0b18", borderLeft: "2px solid #f59e0b" }}
        title={res.memberName}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        <Link href={`/dashboard/members/${res.memberId}`} onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-amber-800 truncate max-w-[80px]">
          {res.memberName}
        </Link>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-all flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); convertReservationToSlot(res, dayIdx); }}
            className="text-slate-400 hover:text-emerald-500 transition-colors" title="→ Σταθερό">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeReservation(res.id); }}
            className="text-slate-400 hover:text-red-500 transition-colors" title="Αφαίρεση">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <MemberFilter members={members} selectedId={filterMemberId} onChange={setFilterMemberId} />
        {filterMemberId && (
          <span className="text-sm text-slate-500">
            Εμφάνιση προγράμματος: <span className="font-semibold text-slate-800">{members.find((m) => m.id === filterMemberId)?.name}</span>
          </span>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="py-3" />
          {days.map((day, i) => {
            const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
            return (
              <div key={i} className="py-3 text-center border-l border-slate-100">
                <p className="text-xs font-medium text-slate-400">{DAY_NAMES[i]}</p>
                <p className={`text-lg font-bold mt-0.5 w-9 h-9 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-slate-800"}`}>{day.getDate()}</p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto max-h-[640px]">
          {HOURS.map((hour) => (
            <div key={hour} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", height: "80px" }}>
              <div className="pt-2 px-2 text-right select-none">
                <span className="text-xs text-slate-400 font-medium">{String(hour).padStart(2, "0")}:00</span>
              </div>
              {days.map((day, dayIdx) => {
                const isSunday = dayIdx === 6;
                const sessions = getSessions(dayIdx, hour);
                const daySlots = getSlots(dayIdx, hour);
                const dayRes = getReservations(dayIdx, hour);
                const cellKey = `${dayIdx}-${hour}`;
                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const timeStr = `${String(hour).padStart(2, "0")}:00`;
                const hasPending = pendingSet.has(`${dateStr}_${timeStr}`);
                return (
                  <div
                    key={dayIdx}
                    className={`border-l border-slate-100 p-1 group relative transition-colors overflow-hidden ${
                      isSunday
                        ? "bg-slate-50/80 cursor-not-allowed"
                        : dragOver === cellKey
                        ? "bg-blue-50 ring-1 ring-inset ring-blue-300 cursor-pointer"
                        : "hover:bg-slate-50/60 cursor-pointer"
                    }`}
                    onDragOver={(e) => { if (!isSunday && daySlots.length + dayRes.length < SLOT_CAPACITY) { e.preventDefault(); setDragOver(cellKey); } }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => { if (!isSunday && daySlots.length + dayRes.length < SLOT_CAPACITY) onDrop(dayIdx, hour); }}
                    onClick={(e) => { if (isSunday || (e.target as HTMLElement).closest("[data-card]")) return; if (daySlots.length + dayRes.length < SLOT_CAPACITY) openModal(dayIdx, hour); }}
                  >
                    {isSunday && hour === 9 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-300 font-medium rotate-[-30deg]">Κλειστά</span>
                      </div>
                    )}
                    {/* Class sessions — full width */}
                    {sessions.map((s) => {
                      const color = s.class.color ?? "#3b82f6";
                      return (
                        <div key={s.id} data-card className="rounded-md overflow-hidden mb-0.5" style={{ borderLeft: `3px solid ${color}`, backgroundColor: color + "18" }}>
                          <Link href={`/dashboard/schedule/${s.id}`} className={`flex items-center gap-1.5 px-1.5 py-1 ${s.isCancelled ? "opacity-40" : ""}`}>
                            <p className="text-xs font-semibold text-slate-800 truncate">{s.class.name}</p>
                            <span className="text-xs text-slate-400 flex-shrink-0">{s.bookings.length}/{s.class.capacity}</span>
                          </Link>
                        </div>
                      );
                    })}

                    {/* Member cards — horizontal wrap */}
                    {(daySlots.length > 0 || dayRes.length > 0) && (
                      <div className="flex flex-wrap gap-0.5 content-start overflow-hidden" style={{ maxHeight: sessions.length > 0 ? "44px" : "68px" }}>
                        {daySlots.map((slot) => renderSlotCard(slot, dayIdx))}
                        {dayRes.map((res) => renderReservationCard(res, dayIdx))}
                      </div>
                    )}

                    {!isSunday && sessions.length === 0 && daySlots.length + dayRes.length >= SLOT_CAPACITY && !hasPending && (
                      <div className="absolute top-0.5 right-0.5 pointer-events-none">
                        <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: "#f97316" }} title="Πλήρες" />
                      </div>
                    )}
                    {hasPending && (
                      <div className="absolute top-0.5 right-0.5 pointer-events-none">
                        <span className="w-2.5 h-2.5 rounded-full block animate-pulse" style={{ backgroundColor: "#ef4444" }} title="Εκκρεμές αίτημα" />
                      </div>
                    )}
                    {sessions.length === 0 && daySlots.length === 0 && dayRes.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-300 font-medium">+ Προσθήκη</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-4 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-100 border-l-2 border-blue-500" /><span className="text-xs text-slate-500">Μάθημα</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-100 border-l-2 border-emerald-500" /><span className="text-xs text-slate-500">Σταθερό</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-100 border-l-2 border-amber-500" /><span className="text-xs text-slate-500">Κράτηση</span></div>
          <span className="text-xs text-slate-400 ml-auto">Κλικ για προσθήκη · Drag για μετακίνηση · Hover για επιλογές</span>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 font-medium">{DAY_NAMES[modal.dayIdx]} · {String(modal.hour).padStart(2, "0")}:00 — {days[modal.dayIdx].toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" })}</p>
              <h3 className="font-semibold text-slate-900 mt-0.5">Προσθήκη αθλητή</h3>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setBookingType("recurring")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${bookingType === "recurring" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Σταθερό
                </button>
                <button type="button" onClick={() => setBookingType("once")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${bookingType === "once" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Κράτηση
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                {bookingType === "recurring" ? "Επαναλαμβάνεται κάθε εβδομάδα" : `Μόνο ${days[modal.dayIdx].toLocaleDateString("el-GR", { weekday: "long", day: "2-digit", month: "long" })}`}
              </p>
            </div>

            <div className="px-4 pb-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input ref={searchRef} type="text" placeholder="Αναζήτηση αθλητή..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto px-2 pb-2">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Δεν βρέθηκαν αθλητές</p>
              ) : filteredMembers.map((m) => {
                const hasSlotThisDay = bookingType === "recurring" && (memberMap[m.id] ?? []).some((s) => s.day === modal.dayIdx + 1);
                return (
                  <button key={m.id} onClick={() => addMember(m)} disabled={saving}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                      {hasSlotThisDay && <p className="text-xs text-amber-600">Υπάρχον σταθερό — θα αντικατασταθεί</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-200 transition-colors">Ακύρωση</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
