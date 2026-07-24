"use client";

import Link from "next/link";

const DAY_NAMES = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9–21

interface Schedule {
  id: string;
  startsAt: string;
  endsAt: string;
  isCancelled: boolean;
  class: {
    id: string;
    name: string;
    color: string | null;
    capacity: number;
    instructor: { name: string } | null;
  };
  bookings: { id: string }[];
}

interface RecurringSlot {
  memberId: string;
  memberName: string;
  day: number; // 1=Mon..7=Sun
  time: string;
  dateISO: string;
}

export default function WeeklySchedule({
  schedules,
  monday,
  recurringSlots = [],
}: {
  schedules: Schedule[];
  monday: string;
  recurringSlots?: RecurringSlot[];
}) {
  const mondayDate = new Date(monday);

  // Mon–Sat only (indices 0–5)
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    return d;
  });

  const today = new Date();

  // Get class sessions for a specific day+hour
  const getSessionsAt = (day: Date, hour: number) =>
    schedules.filter((s) => {
      const d = new Date(s.startsAt);
      return (
        d.getDate() === day.getDate() &&
        d.getMonth() === day.getMonth() &&
        d.getFullYear() === day.getFullYear() &&
        d.getHours() === hour
      );
    });

  // Get recurring member slots for a specific day (1=Mon..6=Sat) + hour
  const getSlotsAt = (dayIndex: number, hour: number) =>
    recurringSlots.filter((s) => {
      const [h] = s.time.split(":").map(Number);
      return s.day === dayIndex + 1 && h === hour;
    });

  return (
    <div className="rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "56px repeat(6, 1fr)" }}>
        <div className="py-3" /> {/* time gutter */}
        {days.map((day, i) => {
          const isToday =
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();
          return (
            <div key={i} className="py-3 text-center border-l border-slate-100">
              <p className="text-xs font-medium text-slate-400">{DAY_NAMES[i]}</p>
              <p className={`text-lg font-bold mt-0.5 w-9 h-9 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-slate-800"}`}>
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[640px]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid border-b border-slate-100 last:border-b-0"
            style={{ gridTemplateColumns: "56px repeat(6, 1fr)", minHeight: "80px" }}
          >
            {/* Hour label */}
            <div className="pt-2 px-2 text-right">
              <span className="text-xs text-slate-400 font-medium">{String(hour).padStart(2, "0")}:00</span>
            </div>

            {/* Day columns */}
            {days.map((day, i) => {
              const sessions = getSessionsAt(day, hour);
              const slots = getSlotsAt(i, hour);
              const isEmpty = sessions.length === 0 && slots.length === 0;

              return (
                <div key={i} className={`border-l border-slate-100 p-1.5 space-y-1 ${isEmpty ? "" : ""}`}>
                  {sessions.map((s) => {
                    const color = s.class.color ?? "#3b82f6";
                    const spotsLeft = s.class.capacity - s.bookings.length;
                    return (
                      <Link
                        key={s.id}
                        href={`/dashboard/schedule/${s.id}`}
                        className={`block rounded-lg px-2 py-1.5 transition-opacity ${s.isCancelled ? "opacity-40" : "hover:opacity-90"}`}
                        style={{ backgroundColor: color + "18", borderLeft: `3px solid ${color}` }}
                      >
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{s.class.name}</p>
                        {s.class.instructor && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{s.class.instructor.name}</p>
                        )}
                        {s.bookings.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {s.bookings.slice(0, 4).map((b) => (
                              <div key={b.id} className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-xs text-slate-600 truncate">{(b as { id: string; memberName?: string }).memberName ?? ""}</span>
                              </div>
                            ))}
                            {s.bookings.length > 4 && (
                              <p className="text-xs text-slate-400">+{s.bookings.length - 4} ακόμα</p>
                            )}
                          </div>
                        )}
                        <p className={`text-xs mt-1 font-medium ${spotsLeft === 0 ? "text-red-500" : "text-slate-400"}`}>
                          {s.bookings.length}/{s.class.capacity} θέσεις
                          {s.isCancelled && " · ΑΚΥΡΩΘΗΚΕ"}
                        </p>
                      </Link>
                    );
                  })}

                  {slots.map((slot) => (
                    <Link
                      key={`${slot.memberId}-${slot.time}`}
                      href={`/dashboard/members/${slot.memberId}`}
                      className="block rounded-lg px-2 py-1.5 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#10b98118", borderLeft: "3px solid #10b981" }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-emerald-800 truncate">{slot.memberName}</p>
                      </div>
                      <p className="text-xs text-emerald-600 mt-0.5">{slot.time}</p>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-100 border-l-2 border-blue-500" />
          <span className="text-xs text-slate-500">Μάθημα</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-100 border-l-2 border-emerald-500" />
          <span className="text-xs text-slate-500">Σταθερή προπόνηση</span>
        </div>
      </div>
    </div>
  );
}
