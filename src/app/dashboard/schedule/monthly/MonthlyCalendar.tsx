"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import MemberFilter from "../MemberFilter";

const DAY_NAMES_SHORT = ["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"];
const DAY_NAMES_FULL = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9);

interface ScheduleItem {
  id: string; startsAt: string; isCancelled: boolean; className: string;
  color: string | null; capacity: number; bookingsCount: number; memberNames: string[];
}
interface RecurringSlot {
  memberId: string; memberName: string; day: number; time: string; isoWeekDay: number;
}
interface Reservation {
  id: string; memberId: string; memberName: string; day: number; time: string; dateISO: string;
}
interface MemberInfo {
  id: string; name: string; slots: { day: number; time: string }[];
}
type DragItem =
  | { kind: "reservation"; id: string; memberId: string; memberName: string; time: string; fromDay: number }
  | { kind: "recurring"; memberId: string; memberName: string; isoWeekDay: number; time: string; fromDay: number };

export default function MonthlyCalendar({
  year, month, daysInMonth, firstDayOfWeek, schedules,
  recurringSlots: initialRecurring, initialReservations, members, pendingDays = [],
}: {
  year: number; month: number; daysInMonth: number; firstDayOfWeek: number;
  schedules: ScheduleItem[]; recurringSlots: RecurringSlot[];
  initialReservations: Reservation[]; members: MemberInfo[];
  pendingDays?: number[];
}) {
  const pendingDaySet = new Set(pendingDays);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [recurring, setRecurring] = useState<RecurringSlot[]>(initialRecurring);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [memberMap, setMemberMap] = useState<Record<string, { day: number; time: string }[]>>(
    () => Object.fromEntries(members.map((m) => [m.id, m.slots]))
  );

  // Drag state
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverHour, setDragOverHour] = useState<string | null>(null); // "hour" for detail panel

  // Drop-to-day slot picker
  const [dropModal, setDropModal] = useState<{ targetDay: number; item: DragItem } | null>(null);
  const [dropSaving, setDropSaving] = useState(false);

  // Add modal
  const [modal, setModal] = useState<{ hour: number } | null>(null);
  const [bookingType, setBookingType] = useState<"recurring" | "once">("once");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── data helpers ──────────────────────────────────────────────────
  const getSchedulesForDay = (day: number) =>
    schedules.filter((s) => new Date(s.startsAt).getDate() === day)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const getRecurringForDay = (day: number) => recurring.filter((s) => s.day === day && (!filterMemberId || s.memberId === filterMemberId));
  const getReservationsForDay = (day: number) => reservations.filter((r) => r.day === day && (!filterMemberId || r.memberId === filterMemberId));

  const dayOfWeek = (day: number) => { // 0=Mon..6=Sun
    const jsDay = new Date(year, month - 1, day).getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  // ── API helpers ───────────────────────────────────────────────────
  async function patchSlots(memberId: string, newSlots: { day: number; time: string }[]) {
    await fetch(`/api/members/${memberId}/slots`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: newSlots }),
    });
  }

  async function createReservation(memberId: string, day: number, time: string) {
    const date = new Date(year, month - 1, day);
    const res = await fetch("/api/reservations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, date: date.toISOString(), time }),
    });
    if (res.ok) return await res.json();
    return null;
  }

  async function deleteReservation(id: string) {
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
  }

  // ── drop on monthly grid → open slot picker ──────────────────────
  function onDropDay(targetDay: number) {
    setDragOverDay(null);
    if (!dragItem) return;
    if (dragItem.fromDay === targetDay) { setDragItem(null); return; }
    const dow = new Date(year, month - 1, targetDay).getDay();
    if (dow === 0) { setDragItem(null); return; } // Sunday closed
    setDropModal({ targetDay, item: dragItem });
    setDragItem(null);
  }

  // ── confirm drop with chosen hour ────────────────────────────────
  async function confirmDrop(hour: number) {
    if (!dropModal) return;
    setDropSaving(true);
    const { targetDay, item } = dropModal;
    const newTime = `${String(hour).padStart(2, "0")}:00`;

    if (item.kind === "reservation") {
      setReservations((prev) => prev.map((r) =>
        r.id === item.id ? { ...r, day: targetDay, time: newTime, dateISO: new Date(year, month - 1, targetDay).toISOString() } : r
      ));
      await fetch(`/api/reservations/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date(year, month - 1, targetDay).toISOString(), time: newTime }),
      });
    } else {
      setRecurring((prev) => prev.filter((s) => !(s.memberId === item.memberId && s.day === item.fromDay && s.isoWeekDay === item.isoWeekDay && s.time === item.time)));
      const created = await createReservation(item.memberId, targetDay, newTime);
      if (created) setReservations((prev) => [...prev, { ...created, day: targetDay, time: newTime }]);
    }
    setDropSaving(false);
    setDropModal(null);
  }

  // ── drop on detail panel (change hour) ───────────────────────────
  async function onDropHour(hour: number) {
    setDragOverHour(null);
    if (!dragItem || !selectedDay) { setDragItem(null); return; }
    const newTime = `${String(hour).padStart(2, "0")}:00`;

    if (dragItem.kind === "reservation") {
      if (dragItem.time === newTime && dragItem.fromDay === selectedDay) { setDragItem(null); return; }
      setReservations((prev) => prev.map((r) => r.id === dragItem.id ? { ...r, time: newTime } : r));
      await fetch(`/api/reservations/${dragItem.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: newTime }),
      });
    } else {
      // Move recurring slot time → create reservation exception
      setRecurring((prev) => prev.filter((s) => !(s.memberId === dragItem.memberId && s.day === selectedDay && s.time === dragItem.time)));
      const created = await createReservation(dragItem.memberId, selectedDay, newTime);
      if (created) setReservations((prev) => [...prev, { ...created, day: selectedDay }]);
    }
    setDragItem(null);
  }

  // ── remove ────────────────────────────────────────────────────────
  async function removeReservation(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    await deleteReservation(id);
  }

  async function removeRecurringFromDay(slot: RecurringSlot) {
    setRecurring((prev) => prev.filter((s) => !(s.memberId === slot.memberId && s.day === slot.day && s.time === slot.time)));
  }

  // ── convert ────────────────────────────────────────────────────────
  async function convertRecurringToReservation(slot: RecurringSlot) {
    if (!selectedDay) return;
    setRecurring((prev) => prev.filter((s) => !(s.memberId === slot.memberId && s.day === slot.day && s.time === slot.time)));
    const created = await createReservation(slot.memberId, selectedDay, slot.time);
    if (created) setReservations((prev) => [...prev, { ...created, day: selectedDay }]);
  }

  async function convertReservationToRecurring(res: Reservation) {
    if (!selectedDay) return;
    await deleteReservation(res.id);
    setReservations((prev) => prev.filter((r) => r.id !== res.id));
    const isoDay = dayOfWeek(selectedDay) + 1; // 1=Mon..7=Sun
    const current = memberMap[res.memberId] ?? [];
    const updated = [...current.filter((s) => s.day !== isoDay), { day: isoDay, time: res.time }];
    setMemberMap((prev) => ({ ...prev, [res.memberId]: updated }));
    // Add recurring slots for this day + all future occurrences of this weekday in the month
    const newSlots: RecurringSlot[] = [];
    for (let d = selectedDay; d <= daysInMonth; d++) {
      if (dayOfWeek(d) + 1 === isoDay) {
        newSlots.push({ memberId: res.memberId, memberName: res.memberName, day: d, time: res.time, isoWeekDay: isoDay });
      }
    }
    setRecurring((prev) => [
      ...prev.filter((s) => !(s.memberId === res.memberId && s.isoWeekDay === isoDay && s.day >= selectedDay)),
      ...newSlots,
    ]);
    await patchSlots(res.memberId, updated);
  }

  // ── add member to a slot ─────────────────────────────────────────
  function openAddModal(hour: number) {
    setModal({ hour });
    setBookingType("once");
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  async function addMember(member: MemberInfo) {
    if (!modal || !selectedDay) return;
    setSaving(true);
    const newTime = `${String(modal.hour).padStart(2, "0")}:00`;
    const isoDay = dayOfWeek(selectedDay) + 1; // 1=Mon..7=Sun

    if (bookingType === "recurring") {
      const current = memberMap[member.id] ?? [];
      const updated = [...current.filter((s) => s.day !== isoDay), { day: isoDay, time: newTime }];
      setMemberMap((prev) => ({ ...prev, [member.id]: updated }));
      // Add to recurring view for this month
      const newSlots: RecurringSlot[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = dayOfWeek(d);
        if (dow + 1 === isoDay) {
          newSlots.push({ memberId: member.id, memberName: member.name, day: d, time: newTime, isoWeekDay: isoDay });
        }
      }
      setRecurring((prev) => [...prev.filter((s) => !(s.memberId === member.id && s.isoWeekDay === isoDay)), ...newSlots]);
      await patchSlots(member.id, updated);
    } else {
      const created = await createReservation(member.id, selectedDay, newTime);
      if (created) setReservations((prev) => [...prev, { ...created, day: selectedDay }]);
    }
    setSaving(false);
    setModal(null);
  }

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  // ── monthly grid ──────────────────────────────────────────────────
  const rows = Math.ceil((firstDayOfWeek + daysInMonth) / 7);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <MemberFilter members={members} selectedId={filterMemberId} onChange={setFilterMemberId} />
        {filterMemberId && (
          <span className="text-sm text-slate-500">
            Εμφάνιση προγράμματος: <span className="font-semibold text-slate-800">{members.find((m) => m.id === filterMemberId)?.name}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
      {/* Monthly grid */}
      <div className={`rounded-2xl overflow-hidden transition-all ${selectedDay ? "lg:w-[55%]" : "flex-1"}`}>
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DAY_NAMES_SHORT.map((n) => (
            <div key={n} className="py-3 text-center text-xs font-semibold text-slate-500 tracking-wider">{n}</div>
          ))}
        </div>

        <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rows}, minmax(80px, auto))` }}>
          {Array.from({ length: rows * 7 }, (_, i) => {
            const day = i - firstDayOfWeek + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = selectedDay === day;
            const daySessions = isValid ? getSchedulesForDay(day) : [];
            const dayRec = isValid ? getRecurringForDay(day) : [];
            const dayRes = isValid ? getReservationsForDay(day) : [];
            const total = daySessions.length + dayRec.length + dayRes.length;
            const isDow6 = isValid && dayOfWeek(day) === 6; // Sunday
            const isDragTarget = dragOverDay === day;

            return (
              <div
                key={i}
                className={`border-r border-b border-slate-100 p-1.5 transition-colors ${
                  !isValid ? "bg-slate-50/40" :
                  isDow6 ? "bg-slate-50/60 cursor-pointer" :
                  isDragTarget ? "bg-blue-50 ring-2 ring-inset ring-blue-300 cursor-copy" :
                  isSelected ? "bg-blue-50 cursor-pointer" : "hover:bg-slate-50 cursor-pointer"
                }`}
                onClick={() => isValid && setSelectedDay(isSelected ? null : day)}
                onDragOver={(e) => { if (isValid) { e.preventDefault(); setDragOverDay(day); } }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={() => isValid && onDropDay(day)}
              >
                {isValid && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? "bg-blue-600 text-white" : isSelected ? "bg-blue-100 text-blue-700" : "text-slate-700"
                      }`}>{day}</span>
                      <div className="flex items-center gap-1">
                        {pendingDaySet.has(day) && (
                          <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: "#ef4444" }} title="Εκκρεμές αίτημα" />
                        )}
                        {total > 0 && <span className="text-xs text-slate-400">{total}</span>}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {daySessions.slice(0, 1).map((s) => {
                        const color = s.color ?? "#3b82f6";
                        return (
                          <div key={s.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate" style={{ backgroundColor: color + "20", borderLeft: `2px solid ${color}` }}>
                            <span className="text-slate-400 text-[10px] flex-shrink-0">{new Date(s.startsAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className="font-medium text-slate-700 truncate">{s.className}</span>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap gap-0.5">
                        {[...dayRec, ...dayRes].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 4).map((item, idx) => {
                          const isRec = "isoWeekDay" in item;
                          const color = isRec ? "#10b981" : "#f59e0b";
                          return (
                            <div
                              key={idx}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                if (isRec) {
                                  setDragItem({ kind: "recurring", memberId: item.memberId, memberName: item.memberName, isoWeekDay: (item as RecurringSlot).isoWeekDay, time: item.time, fromDay: day });
                                } else {
                                  setDragItem({ kind: "reservation", id: (item as Reservation).id, memberId: item.memberId, memberName: item.memberName, time: item.time, fromDay: day });
                                }
                              }}
                              onDragEnd={() => setDragItem(null)}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium cursor-grab active:cursor-grabbing truncate max-w-[60px]"
                              style={{ backgroundColor: color + "20", borderLeft: `2px solid ${color}`, color: isRec ? "#065f46" : "#92400e" }}
                              title={item.memberName}
                            >
                              {item.time} {item.memberName}
                            </div>
                          );
                        })}
                        {total - daySessions.slice(0,1).length > 4 && <span className="text-[10px] text-slate-400">+{total - daySessions.slice(0,1).length - 4}</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-100 border-l-2 border-blue-500" /><span className="text-xs text-slate-500">Μάθημα</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border-l-2 border-emerald-500" /><span className="text-xs text-slate-500">Σταθερό</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-100 border-l-2 border-amber-500" /><span className="text-xs text-slate-500">Κράτηση</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-slate-500">Εκκρεμές αίτημα</span></div>
          <span className="text-xs text-slate-400 ml-auto">Κλικ σε μέρα · Drag για μετακίνηση</span>
        </div>
      </div>

      {/* Day detail panel — time grid */}
      {selectedDay && (() => {
        const dow = dayOfWeek(selectedDay);
        const isSunday = dow === 6;
        const daySessions = getSchedulesForDay(selectedDay);
        const dayRec = getRecurringForDay(selectedDay);
        const dayRes = getReservationsForDay(selectedDay);

        return (
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-xs text-slate-400">{DAY_NAMES_FULL[dow]}</p>
                <p className="font-bold text-slate-900">{selectedDay} {new Date(year, month - 1, 1).toLocaleDateString("el-GR", { month: "long", year: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isSunday && (
                  <button
                    onClick={() => openAddModal(9)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Προσθήκη
                  </button>
                )}
                <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto flex-1">
              {isSunday ? (
                <div className="flex items-center justify-center h-32 text-slate-300 text-sm">Κλειστά</div>
              ) : (
                HOURS.map((hour) => {
                  const sessions = daySessions.filter((s) => new Date(s.startsAt).getHours() === hour);
                  const slots = dayRec.filter((s) => parseInt(s.time) === hour);
                  const ress = dayRes.filter((r) => parseInt(r.time) === hour);
                  const hourKey = String(hour);
                  const isDropTarget = dragOverHour === hourKey;

                  // Build filled entries for this hour
                  const filled: Array<{ kind: "recurring"; slot: RecurringSlot } | { kind: "reservation"; res: Reservation }> = [
                    ...slots.map((s) => ({ kind: "recurring" as const, slot: s })),
                    ...ress.map((r) => ({ kind: "reservation" as const, res: r })),
                  ];
                  const CAPACITY = 2;
                  const isFull = filled.length >= CAPACITY;
                  const emptyCount = Math.max(0, CAPACITY - filled.length);

                  return (
                    <div
                      key={hour}
                      className={`flex gap-2 border-b border-slate-50 last:border-0 transition-colors ${isDropTarget && !isFull ? "bg-blue-50" : ""}`}
                      style={{ minHeight: "56px" }}
                      onDragOver={(e) => { if (!isFull) { e.preventDefault(); setDragOverHour(hourKey); } }}
                      onDragLeave={() => setDragOverHour(null)}
                      onDrop={() => { if (!isFull) onDropHour(hour); }}
                    >
                      {/* Hour label */}
                      <div className="w-12 flex-shrink-0 pt-3 pl-3 text-xs text-slate-400 font-medium select-none">
                        {String(hour).padStart(2, "0")}:00
                      </div>

                      {/* Slots column */}
                      <div className="flex-1 py-2 pr-3 flex flex-col gap-1.5">
                        {/* Class sessions (if any) */}
                        {sessions.map((s) => {
                          const color = s.color ?? "#3b82f6";
                          return (
                            <Link key={s.id} href={`/dashboard/schedule/${s.id}`}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                              style={{ backgroundColor: color + "18", borderLeft: `3px solid ${color}`, color: "#1e293b" }}
                            >
                              {s.className}
                              <span className="font-normal text-slate-500">{s.bookingsCount}/{s.capacity}</span>
                              {s.memberNames.slice(0, 3).map((n) => (
                                <span key={n} className="text-slate-500 font-normal">· {n.split(" ")[0]}</span>
                              ))}
                            </Link>
                          );
                        })}

                        {/* Personal slots — always show CAPACITY boxes */}
                        <div className="flex gap-1.5 flex-wrap">
                          {filled.map((entry, idx) => {
                            if (entry.kind === "recurring") {
                              const slot = entry.slot;
                              return (
                                <div
                                  key={idx}
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); setDragItem({ kind: "recurring", memberId: slot.memberId, memberName: slot.memberName, isoWeekDay: slot.isoWeekDay, time: slot.time, fromDay: selectedDay }); }}
                                  onDragEnd={() => setDragItem(null)}
                                  className="group/chip inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing"
                                  style={{ backgroundColor: "#10b98118", borderLeft: "3px solid #10b981", color: "#065f46" }}
                                >
                                  <Link href={`/dashboard/members/${slot.memberId}`} onClick={(e) => e.stopPropagation()}>
                                    {slot.memberName}
                                  </Link>
                                  <div className="opacity-0 group-hover/chip:opacity-100 flex items-center gap-0.5 transition-all ml-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); convertRecurringToReservation(slot); }}
                                      className="text-emerald-400 hover:text-amber-500 transition-colors" title="→ Κράτηση (μόνο αυτή η μέρα)">
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); removeRecurringFromDay(slot); }}
                                      className="text-emerald-400 hover:text-red-500 transition-colors" title="Αφαίρεση">
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              const res = entry.res;
                              return (
                                <div
                                  key={idx}
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); setDragItem({ kind: "reservation", id: res.id, memberId: res.memberId, memberName: res.memberName, time: res.time, fromDay: selectedDay }); }}
                                  onDragEnd={() => setDragItem(null)}
                                  className="group/chip inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing"
                                  style={{ backgroundColor: "#f59e0b18", borderLeft: "3px solid #f59e0b", color: "#92400e" }}
                                >
                                  <Link href={`/dashboard/members/${res.memberId}`} onClick={(e) => e.stopPropagation()}>
                                    {res.memberName}
                                  </Link>
                                  <div className="opacity-0 group-hover/chip:opacity-100 flex items-center gap-0.5 transition-all ml-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); convertReservationToRecurring(res); }}
                                      className="text-amber-400 hover:text-emerald-500 transition-colors" title="→ Σταθερό (επαναλαμβανόμενο)">
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); removeReservation(res.id); }}
                                      className="text-amber-400 hover:text-red-500 transition-colors" title="Αφαίρεση">
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          })}

                          {/* Empty slot boxes */}
                          {!isFull && Array.from({ length: emptyCount }, (_, i) => (
                            <button
                              key={`empty-${i}`}
                              onClick={() => openAddModal(hour)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Κενό
                            </button>
                          ))}
                          {isFull && (
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 self-center" style={{ backgroundColor: "#f97316" }} title="Πλήρες" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Drop slot-picker modal */}
      {dropModal && (() => {
        const { targetDay, item } = dropModal;
        const dow = dayOfWeek(targetDay);
        const dayRec = recurring.filter((s) => s.day === targetDay);
        const dayRes = reservations.filter((r) => r.day === targetDay);
        const CAPACITY = 2;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setDropModal(null); }}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs text-slate-400">{DAY_NAMES_FULL[dow]} {targetDay} {new Date(year, month - 1, 1).toLocaleDateString("el-GR", { month: "long", year: "numeric" })}</p>
                <h3 className="font-semibold text-slate-900 mt-0.5">Μεταφορά: <span className="text-blue-600">{item.memberName}</span></h3>
                <p className="text-xs text-slate-400 mt-0.5">Επίλεξε ώρα στη νέα μέρα</p>
              </div>
              <div className="max-h-80 overflow-y-auto px-3 py-3 space-y-1">
                {HOURS.map((hour) => {
                  const occupied = [
                    ...dayRec.filter((s) => parseInt(s.time) === hour),
                    ...dayRes.filter((r) => parseInt(r.time) === hour),
                  ];
                  const isFull = occupied.length >= CAPACITY;
                  const timeStr = `${String(hour).padStart(2, "0")}:00`;
                  return (
                    <button
                      key={hour}
                      disabled={isFull || dropSaving}
                      onClick={() => confirmDrop(hour)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={isFull
                        ? { backgroundColor: "#f8f8f8", color: "#94a3b8" }
                        : { backgroundColor: "#eff6ff", color: "#1d4ed8", cursor: "pointer" }
                      }
                    >
                      <span className="font-semibold">{timeStr}</span>
                      <span className="text-xs">
                        {isFull
                          ? "Πλήρες"
                          : occupied.length === 0
                            ? "Ελεύθερο"
                            : `${occupied.map(o => o.memberName).join(", ")} · ${CAPACITY - occupied.length} θέση`
                        }
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setDropModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-200 transition-colors">Ακύρωση</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add modal */}
      {modal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs text-slate-400">{DAY_NAMES_FULL[dayOfWeek(selectedDay)]} {selectedDay} · {String(modal.hour).padStart(2, "0")}:00</p>
              <h3 className="font-semibold text-slate-900 mt-0.5">Προσθήκη αθλητή</h3>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setBookingType("once")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${bookingType === "once" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500"}`}>
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Κράτηση
                </button>
                <button type="button" onClick={() => setBookingType("recurring")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${bookingType === "recurring" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Σταθερό
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                {bookingType === "recurring" ? `Κάθε ${DAY_NAMES_FULL[dayOfWeek(selectedDay)]} στις ${String(modal.hour).padStart(2, "0")}:00` : "Μόνο αυτή την ημέρα"}
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
              {filteredMembers.map((m) => (
                <button key={m.id} onClick={() => addMember(m)} disabled={saving}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {m.name[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                </button>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-200 transition-colors">Ακύρωση</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
