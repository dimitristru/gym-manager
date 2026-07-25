"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MemberPortalProps, Session } from "../MemberPortal";

const DAYS_SHORT = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];
const DAYS_FULL  = ["Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο","Κυριακή"];
const MONTHS_EL  = ["Ιαν","Φεβ","Μαρ","Απρ","Μαΐ","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"];
const DAY_ISO    = ["","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο","Κυριακή"];
const HOURS      = Array.from({ length: 13 }, (_, i) => i + 9);
const SLOT_CAPACITY = 2;

type ViewMode = "weekly" | "monthly";

function fmt(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MONTHS_EL[d.getMonth()]}`;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getMondayOf(base: Date, offset = 0) {
  const d = new Date(base);
  d.setHours(0,0,0,0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return d;
}

export default function MemberScheduleTab({
  memberId, sessions, pendingRequestKeys, pendingNewSessions, weeklySlots, changeRequests, activeSubscription,
}: MemberPortalProps) {
  const router = useRouter();
  const now = new Date();
  const todayStr = isoDate(now);

  // ── state ─────────────────────────────────────────────────────────────
  const [view,        setView]        = useState<ViewMode>("weekly");
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // availability map: "YYYY-MM-DD_HH:MM" -> count
  const [avail, setAvail] = useState<Record<string, number>>({});
  const [loadingAvail, setLoadingAvail] = useState(false);

  // drag
  const [dragging, setDragging]   = useState<Session | null>(null);
  const [dragOver,  setDragOver]  = useState<string | null>(null); // "YYYY-MM-DD_HH:MM"

  // reschedule modal (pre-filled from drop or manual)
  const [modal,       setModal]       = useState<{ session: Session; newDate: string; newTime: string } | null>(null);
  const [note,        setNote]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // cancel modal
  const [cancelModal, setCancelModal] = useState<Session | null>(null);
  const [cancelNote,  setCancelNote]  = useState("");

  // slot editor — auto-open when member has no schedule yet
  const slotEditorRef = useRef<HTMLDivElement>(null);
  const [editSlots,  setEditSlots]  = useState(weeklySlots.length === 0);
  const [slots,      setSlots]      = useState(weeklySlots);
  const [savingSlots,setSavingSlots] = useState(false);
  const [slotsSaved, setSlotsSaved]  = useState(false);

  const [localPending, setLocalPending] = useState<string[]>([]);
  const pendingSet = new Set([...pendingRequestKeys, ...localPending]);

  // NEW_SESSION: pending slots from DB + locally added this session
  const [localNewSessions, setLocalNewSessions] = useState<{ date: string; time: string }[]>([]);
  const allPendingNew = [
    ...(pendingNewSessions ?? []).map(r => ({ date: r.date, time: r.time })),
    ...localNewSessions,
  ];
  const pendingNewSet = new Set(allPendingNew.map(r => `${r.date}_${r.time}`));

  // Package quota tracking
  // classesLeft is decremented by admin on check-in; subtract pending NEW_SESSION requests submitted this session
  const rawClassesLeft = activeSubscription?.classesLeft ?? null;
  const pendingNewCount = allPendingNew.length;
  const sessionsRemaining = rawClassesLeft !== null ? Math.max(0, rawClassesLeft - pendingNewCount) : null;
  // null = unlimited plan; 0 = exhausted; >0 = has remaining
  const packageExhausted = sessionsRemaining !== null && sessionsRemaining <= 0;
  const hasPackage = !!activeSubscription;

  // new session confirm modal
  const [newSessionModal, setNewSessionModal] = useState<{ date: string; time: string; outsidePackage: boolean } | null>(null);
  const [newSessionNote, setNewSessionNote]   = useState("");

  // monthly action modal (click on session in monthly view)
  const [monthlyAction, setMonthlyAction] = useState<{
    session: Session;
    tab: "reschedule" | "cancel";
    newDate: string;
    loadingSlots: boolean;
    daySlots: Record<string, number>; // "HH:MM" -> occupancy
  } | null>(null);

  // ── week days ─────────────────────────────────────────────────────────
  const monday   = getMondayOf(now, weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekFrom = isoDate(weekDays[0]);
  const weekTo   = isoDate(weekDays[6]);

  // ── month ─────────────────────────────────────────────────────────────
  const monthDate   = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthYear   = monthDate.getFullYear();
  const monthNum    = monthDate.getMonth() + 1;
  const daysInMonth = new Date(monthYear, monthNum, 0).getDate();
  const firstDow    = (new Date(monthYear, monthNum - 1, 1).getDay() + 6) % 7;

  // ── fetch slots for a specific day (monthly action modal) ────────────
  async function fetchDaySlots(dateStr: string) {
    setMonthlyAction(m => m ? { ...m, loadingSlots: true, daySlots: {} } : null);
    try {
      const res = await fetch(`/api/member/availability?from=${dateStr}&to=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        for (const s of data.slots) {
          const time = s.key.split("_")[1];
          map[time] = s.count;
        }
        setMonthlyAction(m => m ? { ...m, loadingSlots: false, daySlots: map, newDate: dateStr } : null);
      }
    } catch {
      setMonthlyAction(m => m ? { ...m, loadingSlots: false } : null);
    }
  }

  async function submitMonthlyReschedule(newTime: string) {
    if (!monthlyAction) return;
    setSubmitting(true);
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: "RESCHEDULE",
        sessionDate: monthlyAction.session.date,
        sessionTime: monthlyAction.session.time,
        newDate: monthlyAction.newDate,
        newTime,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setMonthlyAction(null);
      router.refresh();
    }
  }

  async function submitMonthlyCancel() {
    if (!monthlyAction) return;
    setSubmitting(true);
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: "CANCEL",
        sessionDate: monthlyAction.session.date,
        sessionTime: monthlyAction.session.time,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setMonthlyAction(null);
      router.refresh();
    }
  }

  // ── fetch availability ────────────────────────────────────────────────
  const fetchAvail = useCallback(async (from: string, to: string) => {
    setLoadingAvail(true);
    try {
      const res = await fetch(`/api/member/availability?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        for (const s of data.slots) map[s.key] = s.count;
        setAvail(map);
      }
    } finally {
      setLoadingAvail(false);
    }
  }, []);

  useEffect(() => {
    if (view === "weekly") fetchAvail(weekFrom, weekTo);
  }, [view, weekFrom, weekTo, fetchAvail]);

  useEffect(() => {
    if (view === "monthly") {
      const from = `${monthYear}-${String(monthNum).padStart(2,"0")}-01`;
      const to   = `${monthYear}-${String(monthNum).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`;
      fetchAvail(from, to);
    }
  }, [view, monthYear, monthNum, daysInMonth, fetchAvail]);

  // ── helpers ───────────────────────────────────────────────────────────
  function sessionAt(dateStr: string, hour: number): Session | undefined {
    return sessions.find(s => s.date === dateStr && parseInt(s.time) === hour);
  }

  function slotOccupancy(dateStr: string, hour: number) {
    const key = `${dateStr}_${String(hour).padStart(2,"0")}:00`;
    return avail[key] ?? 0;
  }

  function slotAvailable(dateStr: string, hour: number) {
    return slotOccupancy(dateStr, hour) < SLOT_CAPACITY;
  }

  function inSubscription(dateStr: string): boolean {
    if (!activeSubscription) return false;
    if (!activeSubscription.endDate) return true; // ongoing
    return dateStr <= activeSubscription.endDate;
  }

  // ── drag & drop ───────────────────────────────────────────────────────
  function onDragStart(session: Session) {
    setDragging(session);
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  function onDragOver(e: React.DragEvent, dateStr: string, hour: number) {
    if (!dragging) return;
    const key = `${dateStr}_${String(hour).padStart(2,"0")}:00`;
    // Block if unavailable (and not the same slot)
    const isSameSlot = dragging.date === dateStr && parseInt(dragging.time) === hour;
    if (!isSameSlot && !slotAvailable(dateStr, hour)) return;
    e.preventDefault();
    setDragOver(key);
  }

  function onDrop(dateStr: string, hour: number) {
    if (!dragging) return;
    const newTime = `${String(hour).padStart(2,"0")}:00`;
    const isSameSlot = dragging.date === dateStr && dragging.time === newTime;
    setDragging(null);
    setDragOver(null);
    if (isSameSlot) return;
    // Open reschedule modal pre-filled
    setModal({ session: dragging, newDate: dateStr, newTime });
    setNote("");
  }

  // ── submit reschedule ─────────────────────────────────────────────────
  async function submitReschedule() {
    if (!modal) return;
    setSubmitting(true);
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: "RESCHEDULE",
        sessionDate: modal.session.date,
        sessionTime: modal.session.time,
        newDate: modal.newDate,
        newTime: modal.newTime,
        note,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setModal(null);
      setNote("");
      router.refresh();
    }
  }

  async function submitCancel() {
    if (!cancelModal) return;
    setSubmitting(true);
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: "CANCEL",
        sessionDate: cancelModal.date,
        sessionTime: cancelModal.time,
        note: cancelNote,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setCancelModal(null);
      setCancelNote("");
      router.refresh();
    }
  }

  // ── submit new session request ────────────────────────────────────────
  async function submitNewSession() {
    if (!newSessionModal) return;
    setSubmitting(true);
    const { date, time } = newSessionModal;
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: "NEW_SESSION",
        sessionDate: date,
        sessionTime: time,
        note: null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setNewSessionModal(null);
      router.refresh();
    }
  }

  // ── slot editor ───────────────────────────────────────────────────────
  function toggleSlot(day: number, time: string) {
    const exists = slots.find(s => s.day === day && s.time === time);
    setSlots(p => exists
      ? p.filter(s => !(s.day === day && s.time === time))
      : [...p, { day, time }]
    );
  }

  async function saveSlots() {
    setSavingSlots(true);
    await fetch(`/api/members/${memberId}/slots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    setSavingSlots(false);
    setSlotsSaved(true);
    setEditSlots(false);
    setTimeout(() => setSlotsSaved(false), 3000);
    router.refresh();
  }

  // ── cell background logic (during drag) ───────────────────────────────
  function cellStyle(dateStr: string, hour: number) {
    if (!dragging) return {};
    const isSameSlot = dragging.date === dateStr && parseInt(dragging.time) === hour;
    if (isSameSlot) return { backgroundColor: "#1e1e1e" };
    const key = `${dateStr}_${String(hour).padStart(2,"0")}:00`;
    if (dragOver === key) return { backgroundColor: "#10b98120", outline: "2px solid #10b981" };
    const occ = avail[key] ?? 0;
    if (occ >= SLOT_CAPACITY) return { backgroundColor: "#ef444410" };
    return { backgroundColor: "#10b98108" };
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: SUBSCRIPTION BANNER
  // ─────────────────────────────────────────────────────────────────────
  function renderSubBanner() {
    if (!activeSubscription) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ backgroundColor: "#ef444412", border: "1px solid #ef444430" }}>
          <span style={{ color: "#ef4444" }}>⚠</span>
          <span className="text-sm font-medium" style={{ color: "#ef4444" }}>
            Δεν υπάρχει ενεργή συνδρομή. Επικοινώνησε με τον admin για ανανέωση.
          </span>
        </div>
      );
    }

    const { planName, endDate, maxClasses, classesLeft, classesUsed } = activeSubscription;
    const daysLeft = endDate
      ? Math.max(0, Math.ceil((new Date(endDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000))
      : null;
    const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
    const accentColor = isExpiringSoon ? "#f59e0b" : "#10b981";
    const bgColor = isExpiringSoon ? "#f59e0b08" : "#10b98108";
    const borderColor = isExpiringSoon ? "#f59e0b25" : "#10b98125";

    return (
      <div className="px-4 py-3 rounded-xl mb-5" style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-sm font-bold text-white">{planName}</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {maxClasses != null && (
              <span className="text-sm" style={{ color: "#a1a1aa" }}>
                <span className="font-bold text-white">{classesUsed}</span>/{maxClasses} προπονήσεις
              </span>
            )}
            {sessionsRemaining !== null && maxClasses != null && (
              <span className="text-sm font-semibold" style={{ color: packageExhausted ? "#ef4444" : accentColor }}>
                {sessionsRemaining === 0 ? "Εξαντλήθηκαν" : `${sessionsRemaining} απομένουν`}
              </span>
            )}
            {endDate && (
              <span className="text-sm" style={{ color: isExpiringSoon ? "#f59e0b" : "#71717a" }}>
                Λήγει {new Date(endDate + "T00:00:00").toLocaleDateString("el-GR", { day: "numeric", month: "long" })}
                {daysLeft !== null && daysLeft <= 14 && (
                  <span className="ml-1 font-semibold">({daysLeft === 0 ? "σήμερα" : `σε ${daysLeft} μέρες`})</span>
                )}
              </span>
            )}
            {!endDate && (
              <span className="text-sm" style={{ color: "#10b981" }}>Αόριστη διάρκεια</span>
            )}
          </div>
        </div>
        {maxClasses != null && (
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (classesUsed / maxClasses) * 100)}%`, backgroundColor: accentColor }} />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: WEEKLY
  // ─────────────────────────────────────────────────────────────────────
  function renderWeekly() {
    return (
      <div>
        {/* Week nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              {weekDays[0].getDate()} {MONTHS_EL[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {MONTHS_EL[weekDays[6].getMonth()]}
            </p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs mt-0.5" style={{ color: "#f97316" }}>
                Τρέχουσα εβδομάδα
              </button>
            )}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Hint */}
        {!loadingAvail && (
          <p className="text-xs text-center mb-3" style={{ color: "#52525b" }}>
            {sessions.length > 0
              ? "Drag προπόνηση για μεταφορά · Κλικ σε κενό slot για νέο μάθημα"
              : "Κλικ σε οποιοδήποτε slot για να κλείσεις προπόνηση"}
          </p>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
          <div className="overflow-x-auto">
          {/* Header row */}
          <div className="grid border-b" style={{ gridTemplateColumns: "44px repeat(7,minmax(44px,1fr))", minWidth: "360px", backgroundColor: "#141414", borderColor: "#1e1e1e" }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = isoDate(d) === todayStr;
              return (
                <div key={i} className="py-3 text-center border-l" style={{ borderColor: "#1e1e1e" }}>
                  <p className="text-[10px] font-semibold" style={{ color: "#52525b" }}>{DAYS_SHORT[i]}</p>
                  <p className={`text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full`}
                    style={isToday ? { backgroundColor: "#f97316", color: "#fff" } : { color: "#a1a1aa" }}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div style={{ backgroundColor: "#0f0f0f", maxHeight: "520px", overflowY: "auto" }}>
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: "44px repeat(7,minmax(44px,1fr))", minWidth: "360px", borderColor: "#1a1a1a", minHeight: "68px" }}>
                {/* Hour label */}
                <div className="flex items-start justify-end pr-2 pt-1.5">
                  <span className="text-[10px] font-medium" style={{ color: "#3f3f46" }}>
                    {String(hour).padStart(2,"0")}:00
                  </span>
                </div>

                {weekDays.map((d, di) => {
                  const dateStr    = isoDate(d);
                  const timeStr    = `${String(hour).padStart(2,"0")}:00`;
                  const key        = `${dateStr}_${timeStr}`;
                  const session    = sessionAt(dateStr, hour);
                  const isPast     = dateStr < todayStr || (dateStr === todayStr && hour < now.getHours());
                  const isPending  = session ? pendingSet.has(`${session.date}_${session.time}`) : false;
                  const isPendingNew = pendingNewSet.has(key);
                  const occ        = avail[key] ?? 0;
                  const isFull     = occ >= SLOT_CAPACITY;
                  const isSunday   = di === 6;
                  const inSub      = inSubscription(dateStr);
                  // Can always click available slots if has active subscription (even if package exhausted — shows warning)
                  const canClick   = !dragging && !session && !isPendingNew && !isPast && !isSunday && !isFull && hasPackage && inSub;

                  return (
                    <div key={di}
                      className="border-l relative transition-colors"
                      style={{
                        borderColor: "#1a1a1a",
                        ...cellStyle(dateStr, hour),
                        cursor: dragging && !isFull && !isSunday ? "copy" : canClick ? "pointer" : "default",
                      }}
                      onDragOver={e => !isSunday && !isPast && onDragOver(e, dateStr, hour)}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => !isSunday && !isPast && onDrop(dateStr, hour)}
                      onClick={() => canClick && (setNewSessionModal({ date: dateStr, time: timeStr, outsidePackage: packageExhausted }), setNewSessionNote(""))}
                    >
                      {/* Session card — within subscription */}
                      {session && !isPending && !isPast && inSub && (
                        <div
                          draggable
                          onDragStart={() => onDragStart(session)}
                          onDragEnd={onDragEnd}
                          className="m-1 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing group select-none"
                          style={{ backgroundColor: "#f9731625", border: "1px solid #f9731650" }}
                        >
                          <p className="text-[11px] font-bold leading-none" style={{ color: "#f97316" }}>{timeStr}</p>
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onMouseDown={e => { e.stopPropagation(); }}
                              onClick={e => { e.stopPropagation(); setCancelModal(session); setCancelNote(""); }}
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>
                              Ακύρωση
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Session card — outside subscription (needs renewal) */}
                      {session && !isPending && !isPast && !inSub && (
                        <div className="m-1 rounded-lg px-2 py-1.5 select-none"
                          style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}>
                          <p className="text-[11px] font-medium leading-none" style={{ color: "#52525b" }}>{timeStr}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: "#3f3f46" }}>Απαιτεί ανανέωση</p>
                        </div>
                      )}

                      {/* Pending session (CANCEL/RESCHEDULE) */}
                      {session && isPending && (
                        <div className="m-1 rounded-lg px-2 py-1.5"
                          style={{ backgroundColor: "#f9731610", border: "1px solid #f9731630" }}>
                          <p className="text-[11px] font-bold leading-none" style={{ color: "#f97316" }}>⏳ {timeStr}</p>
                        </div>
                      )}

                      {/* Past session */}
                      {session && isPast && (
                        <div className="m-1 rounded-lg px-2 py-1.5"
                          style={{ backgroundColor: "#1e1e1e" }}>
                          <p className="text-[11px] font-medium leading-none" style={{ color: "#52525b" }}>{timeStr}</p>
                        </div>
                      )}

                      {/* Pending NEW_SESSION card — amber solid */}
                      {isPendingNew && !session && (
                        <div className="m-1 rounded-lg px-2 py-1.5"
                          style={{ backgroundColor: "#f59e0b30", border: "1px solid #f59e0b80" }}>
                          <p className="text-[11px] font-bold leading-none" style={{ color: "#fbbf24" }}>{timeStr}</p>
                          <p className="text-[9px] mt-0.5 font-semibold" style={{ color: "#f59e0b" }}>Αναμονή έγκρισης</p>
                        </div>
                      )}

                      {/* Availability indicator (when dragging) */}
                      {dragging && !session && !isSunday && !isPast && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {isFull ? (
                            <span className="text-[10px] font-bold" style={{ color: "#ef444460" }}>Πλήρες</span>
                          ) : (
                            <span className="text-[10px] font-bold" style={{ color: "#10b98150" }}>
                              {occ === 0 ? "+" : `${occ}/${SLOT_CAPACITY}`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Available slot — within package (green) */}
                      {!dragging && !session && !isPendingNew && !isFull && !isSunday && !isPast && inSub && hasPackage && !packageExhausted && (
                        <div className="absolute inset-0 m-0.5 rounded-lg flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-all"
                          style={{ backgroundColor: "#10b98118", border: "1px dashed #10b98150" }}>
                          <span className="text-base leading-none" style={{ color: "#10b981" }}>+</span>
                          <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#10b98190" }}>Κράτηση</span>
                        </div>
                      )}

                      {/* Available slot — package exhausted (amber warning) */}
                      {!dragging && !session && !isPendingNew && !isFull && !isSunday && !isPast && inSub && hasPackage && packageExhausted && (
                        <div className="absolute inset-0 m-0.5 rounded-lg flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-all"
                          style={{ backgroundColor: "#f59e0b18", border: "1px dashed #f59e0b50" }}>
                          <span className="text-base leading-none" style={{ color: "#f59e0b" }}>+</span>
                          <span className="text-[9px] font-semibold mt-0.5 text-center px-1 leading-tight" style={{ color: "#f59e0b90" }}>Εκτός πακέτου</span>
                        </div>
                      )}

                      {/* Partial occupancy indicator */}
                      {!dragging && !session && !isPendingNew && !isFull && !isSunday && !isPast && inSub && occ > 0 && (
                        <div className="absolute top-1 right-1 pointer-events-none">
                          <span className="text-[9px] font-bold" style={{ color: "#52525b" }}>{occ}/{SLOT_CAPACITY}</span>
                        </div>
                      )}

                      {/* Full slot indicator */}
                      {!dragging && !session && !isPendingNew && isFull && !isSunday && !isPast && (
                        <div className="absolute inset-0 m-0.5 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: "#ef444408" }}>
                          <span className="text-[10px] font-semibold" style={{ color: "#ef444450" }}>Πλήρες</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>{/* end overflow-x-auto */}

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2.5 flex-wrap" style={{ backgroundColor: "#111111", borderTop: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f9731625", border: "1px solid #f9731650" }} />
              <span className="text-[11px]" style={{ color: "#71717a" }}>Προπόνηση</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f9731612", border: "1px dashed #f9731650" }} />
              <span className="text-[11px]" style={{ color: "#71717a" }}>Εκκρεμεί</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }} />
              <span className="text-[11px]" style={{ color: "#71717a" }}>Εκτός συνδρομής</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef444412" }} />
              <span className="text-[11px]" style={{ color: "#71717a" }}>Πλήρες</span>
            </div>
            <span className="text-[11px] ml-auto hidden sm:inline" style={{ color: "#3f3f46" }}>
              Κλικ σε κενό slot για νέο μάθημα · Drag για μεταφορά
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: MONTHLY
  // ─────────────────────────────────────────────────────────────────────
  function renderMonthly() {
    const DAY_SHORT = ["ΔΕΥ","ΤΡΙ","ΤΕΤ","ΠΕΜ","ΠΑΡ","ΣΑΒ","ΚΥΡ"];
    const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthOffset(m => m - 1)}
            className="p-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white capitalize">
              {monthDate.toLocaleDateString("el-GR", { month: "long", year: "numeric" })}
            </p>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)} className="text-xs mt-0.5" style={{ color: "#f97316" }}>
                Τρέχων μήνας
              </button>
            )}
          </div>
          <button onClick={() => setMonthOffset(m => m + 1)}
            className="p-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
          <div className="overflow-x-auto">
          <div className="grid grid-cols-7" style={{ minWidth: "320px", backgroundColor: "#141414", borderBottom: "1px solid #1e1e1e" }}>
            {DAY_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold" style={{ color: "#52525b" }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7" style={{ minWidth: "320px", backgroundColor: "#0f0f0f" }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum  = i - firstDow + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              if (!isValid) return (
                <div key={i} className="border-r border-b" style={{ borderColor: "#1a1a1a", minHeight: "72px" }} />
              );

              const dateStr  = `${monthYear}-${String(monthNum).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
              const isToday  = dateStr === todayStr;
              const isPast   = dateStr < todayStr;
              const isSun    = new Date(dateStr + "T00:00:00").getDay() === 0;
              const daySess  = sessions.filter(s => s.date === dateStr);
              const hasPend  = daySess.some(s => pendingSet.has(`${s.date}_${s.time}`));
              const isDragTarget = dragging && !isPast && !isSun && dateStr !== dragging.date;

              return (
                <div key={i} className="border-r border-b p-1.5 transition-colors"
                  onDragOver={isDragTarget ? (e) => { e.preventDefault(); setDragOver(dateStr); } : undefined}
                  onDragLeave={() => { if (dragOver === dateStr) setDragOver(null); }}
                  onDrop={isDragTarget ? () => {
                    if (!dragging) return;
                    const s = dragging;
                    setDragging(null);
                    setDragOver(null);
                    setMonthlyAction({ session: s, tab: "reschedule", newDate: dateStr, loadingSlots: false, daySlots: {} });
                    fetchDaySlots(dateStr);
                  } : undefined}
                  style={{
                    borderColor: "#1a1a1a",
                    minHeight: "72px",
                    opacity: isPast && daySess.length === 0 ? 0.35 : 1,
                    backgroundColor: dragOver === dateStr ? "#f9731610" : undefined,
                    outline: dragOver === dateStr ? "1px solid #f9731640" : undefined,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                      style={isToday ? { backgroundColor: "#f97316", color: "#fff" } : { color: isPast ? "#52525b" : "#a1a1aa" }}>
                      {dayNum}
                    </span>
                    {hasPend && <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#f97316" }} />}
                  </div>
                  <div className="space-y-0.5">
                    {daySess.map((s, si) => {
                      const isPending = pendingSet.has(`${s.date}_${s.time}`);
                      const inSub = inSubscription(dateStr);
                      return (
                        <div key={si}
                          draggable={!isPast}
                          onDragStart={!isPast ? () => { setDragging(s); setDragOver(null); } : undefined}
                          onDragEnd={() => { setDragging(null); setDragOver(null); }}
                          onClick={!isPast && !dragging ? () => {
                            setMonthlyAction({ session: s, tab: "reschedule", newDate: dateStr, loadingSlots: false, daySlots: {} });
                            fetchDaySlots(dateStr);
                          } : undefined}
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold select-none"
                          style={{
                            backgroundColor: isPending ? "#f9731610" : isPast ? "#1e1e1e" : inSub ? "#f9731620" : "#27272a",
                            color: isPast ? "#52525b" : inSub ? "#f97316" : "#52525b",
                            border: !isPast && !inSub ? "1px solid #3f3f46" : undefined,
                            cursor: !isPast ? "grab" : "default",
                            opacity: dragging?.date === s.date && dragging?.time === s.time ? 0.4 : 1,
                          }}>
                          {s.time}
                        </div>
                      );
                    })}
                    {!isPast && !isSun && daySess.length === 0 && hasPackage && inSubscription(dateStr) && !dragging && (
                      <div
                        onClick={() => setNewSessionModal({ date: dateStr, time: "", outsidePackage: packageExhausted })}
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-center"
                        style={{ backgroundColor: "#10b98110", color: "#10b98170", border: "1px dashed #10b98130", cursor: "pointer" }}>
                        +
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>{/* end overflow-x-auto */}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: SLOT EDITOR
  // ─────────────────────────────────────────────────────────────────────
  function renderSlotEditor() {
    return (
      <div ref={slotEditorRef} className="rounded-2xl p-5 mt-6" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Σταθερό πρόγραμμα</h3>
            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Μέρες & ώρες κάθε εβδομάδα</p>
          </div>
          {!editSlots ? (
            <button onClick={() => setEditSlots(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ backgroundColor: "#1e1e1e", color: "#f97316", border: "1px solid #f9731440" }}>
              Αλλαγή
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditSlots(false); setSlots(weeklySlots); }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ backgroundColor: "#1e1e1e", color: "#71717a", border: "1px solid #2a2a2a" }}>
                Άκυρο
              </button>
              <button onClick={saveSlots} disabled={savingSlots}
                className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
                style={{ backgroundColor: "#f97316", color: "#fff" }}>
                {savingSlots ? "..." : "Αποθήκευση"}
              </button>
            </div>
          )}
        </div>

        {slotsSaved && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: "#10b98115", color: "#10b981" }}>
            ✓ Αποθηκεύτηκε
          </div>
        )}

        {!editSlots ? (
          slots.length === 0 ? (
            <p className="text-sm" style={{ color: "#52525b" }}>Δεν έχεις ορίσει σταθερό πρόγραμμα</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...slots].sort((a,b) => a.day - b.day || a.time.localeCompare(b.time)).map((s, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: "#f9731615", color: "#f97316", border: "1px solid #f9731630" }}>
                  {DAY_ISO[s.day]} {s.time}
                </span>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {[1,2,3,4,5,6].map(day => {
              const daySlots = slots.filter(s => s.day === day);
              return (
                <div key={day}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "#71717a" }}>{DAY_ISO[day]}</p>
                  <div className="flex flex-wrap gap-1">
                    {HOURS.map(h => {
                      const time   = `${String(h).padStart(2,"0")}:00`;
                      const active = daySlots.some(s => s.time === time);
                      // Check availability for "today" (approximate — we use current week's avail)
                      return (
                        <button key={h} onClick={() => toggleSlot(day, time)}
                          className="text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                          style={active
                            ? { backgroundColor: "#f97316", color: "#fff" }
                            : { backgroundColor: "#1a1a1a", color: "#52525b", border: "1px solid #2a2a2a" }}>
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const hasNoSessions = sessions.length === 0 && allPendingNew.length === 0;

  // ─────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {renderSubBanner()}

      {/* Hint when no sessions booked yet */}
      {hasNoSessions && activeSubscription && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ backgroundColor: "#f9731610", border: "1px solid #f9731630" }}>
          <span className="text-lg mt-0.5">👆</span>
          <div>
            <p className="text-sm font-semibold text-white">Κλείσε τις προπονήσεις σου</p>
            <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>
              Κάνε κλικ σε οποιοδήποτε διαθέσιμο slot για να ζητήσεις κράτηση. Ο admin θα εγκρίνει και η προπόνηση θα εμφανιστεί στο πρόγραμμά σου.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 p-0.5 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
          {(["weekly","monthly"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={view === v ? { backgroundColor: "#f97316", color: "#fff" } : { color: "#71717a" }}>
              {v === "weekly" ? "Εβδομάδα" : "Μήνας"}
            </button>
          ))}
        </div>
      </div>

      {view === "weekly" ? renderWeekly() : renderMonthly()}

      {renderSlotEditor()}

      {/* ── Reschedule modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
            <div>
              <h2 className="font-bold text-white text-lg">Αίτημα μεταφοράς</h2>
              <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                {fmt(modal.session.date)} · {modal.session.time}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Νέα ημερομηνία</label>
                <input type="date" value={modal.newDate} min={todayStr}
                  onChange={e => setModal(m => m ? { ...m, newDate: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Νέα ώρα</label>
                <input type="time" value={modal.newTime}
                  onChange={e => setModal(m => m ? { ...m, newTime: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                Σχόλιο <span style={{ color: "#52525b" }}>(προαιρετικό)</span>
              </label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="π.χ. Ταξίδι, δουλειά..."
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
            </div>

            <div className="flex gap-3">
              <button onClick={submitReschedule}
                disabled={submitting || !modal.newDate || !modal.newTime}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#f97316", color: "#fff" }}>
                {submitting ? "Μεταφορά..." : "Μεταφορά μαθήματος"}
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

      {/* ── New session modal ── */}
      {newSessionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={e => { if (e.target === e.currentTarget) setNewSessionModal(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
            <div>
              <h2 className="font-bold text-white text-lg">Νέο μάθημα</h2>
              <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                {fmt(newSessionModal.date)}{newSessionModal.time ? ` · ${newSessionModal.time}` : ""}
              </p>
            </div>
            {newSessionModal.time === "" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Επέλεξε ώρα</label>
                <input type="time" min="09:00" max="21:00"
                  value={newSessionModal.time}
                  onChange={e => setNewSessionModal(m => m ? { ...m, time: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
              </div>
            )}

            {/* Package status */}
            {!newSessionModal.outsidePackage && sessionsRemaining !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: "#10b98112", border: "1px solid #10b98130" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#10b981" }} />
                <span className="text-sm" style={{ color: "#10b981" }}>
                  <span className="font-bold">{sessionsRemaining}</span> {sessionsRemaining === 1 ? "προπόνηση απομένει" : "προπονήσεις απομένουν"} στο πακέτο σου
                </span>
              </div>
            )}
            {!newSessionModal.outsidePackage && sessionsRemaining === null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: "#10b98112", border: "1px solid #10b98130" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#10b981" }} />
                <span className="text-sm font-medium" style={{ color: "#10b981" }}>Απεριόριστες προπονήσεις στο πακέτο σου</span>
              </div>
            )}
            {newSessionModal.outsidePackage && (
              <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#f59e0b12", border: "1px solid #f59e0b30" }}>
                <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>⚠ Εκτός πακέτου</p>
                <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>
                  Έχεις εξαντλήσει τις προπονήσεις του πακέτου σου. Αυτή η κράτηση θα είναι εκτός συνδρομής — ο admin θα ενημερωθεί.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={submitNewSession} disabled={submitting || !newSessionModal.time}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: newSessionModal.outsidePackage ? "#f59e0b" : "#f97316", color: "#fff" }}>
                {submitting ? "Κράτηση..." : "Κράτηση μαθήματος"}
              </button>
              <button onClick={() => setNewSessionModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly action modal (reschedule / cancel) ── */}
      {monthlyAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={e => { if (e.target === e.currentTarget) setMonthlyAction(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>

            {/* Header */}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#71717a" }}>
                {fmt(monthlyAction.session.date)} · {monthlyAction.session.time}
              </p>
              <h2 className="font-bold text-white text-lg">Τι θέλεις να κάνεις;</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(["reschedule", "cancel"] as const).map(tab => (
                <button key={tab} onClick={() => setMonthlyAction(m => m ? { ...m, tab } : null)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={monthlyAction.tab === tab
                    ? { backgroundColor: tab === "cancel" ? "#ef444420" : "#f9731620", color: tab === "cancel" ? "#ef4444" : "#f97316", border: `1px solid ${tab === "cancel" ? "#ef444440" : "#f9731640"}` }
                    : { backgroundColor: "#1a1a1a", color: "#71717a", border: "1px solid #2a2a2a" }}>
                  {tab === "reschedule" ? "Μεταφορά" : "Ακύρωση"}
                </button>
              ))}
            </div>

            {/* Reschedule tab */}
            {monthlyAction.tab === "reschedule" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Νέα ημερομηνία</label>
                  <input type="date" min={todayStr}
                    value={monthlyAction.newDate}
                    onChange={e => { fetchDaySlots(e.target.value); }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "#a1a1aa" }}>Διαθέσιμες ώρες</label>
                  {monthlyAction.loadingSlots ? (
                    <p className="text-xs text-center py-3" style={{ color: "#52525b" }}>Φόρτωση...</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {HOURS.map(h => {
                        const timeStr = `${String(h).padStart(2,"0")}:00`;
                        const count = monthlyAction.daySlots[timeStr] ?? 0;
                        const isFull = count >= SLOT_CAPACITY;
                        const isCurrent = monthlyAction.session.date === monthlyAction.newDate && monthlyAction.session.time === timeStr;
                        return (
                          <button key={h}
                            disabled={isFull || isCurrent || submitting}
                            onClick={() => submitMonthlyReschedule(timeStr)}
                            className="py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                            style={isFull || isCurrent
                              ? { backgroundColor: "#1a1a1a", color: "#3f3f46", border: "1px solid #2a2a2a", cursor: "not-allowed" }
                              : { backgroundColor: "#f9731615", color: "#f97316", border: "1px solid #f9731430" }}>
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancel tab */}
            {monthlyAction.tab === "cancel" && (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: "#a1a1aa" }}>
                  Είσαι σίγουρος ότι θέλεις να ακυρώσεις το μάθημα της {fmt(monthlyAction.session.date)} στις {monthlyAction.session.time};
                </p>
                <button onClick={submitMonthlyCancel} disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: "#ef4444", color: "#fff" }}>
                  {submitting ? "Ακύρωση..." : "Ακύρωση μαθήματος"}
                </button>
              </div>
            )}

            <button onClick={() => setMonthlyAction(null)}
              className="w-full py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "#1e1e1e", color: "#71717a", border: "1px solid #2a2a2a" }}>
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={e => { if (e.target === e.currentTarget) setCancelModal(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
            <div>
              <h2 className="font-bold text-white text-lg">Ακύρωση μαθήματος</h2>
              <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                {fmt(cancelModal.date)} · {cancelModal.time}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                Σχόλιο <span style={{ color: "#52525b" }}>(προαιρετικό)</span>
              </label>
              <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)} rows={2}
                placeholder="π.χ. Ταξίδι, δουλειά..."
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
            </div>
            <div className="flex gap-3">
              <button onClick={submitCancel} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#ef4444", color: "#fff" }}>
                {submitting ? "Ακύρωση..." : "Ακύρωση μαθήματος"}
              </button>
              <button onClick={() => setCancelModal(null)}
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
