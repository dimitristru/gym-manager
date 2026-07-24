"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Session {
  date: string;
  time: string;
  type: "recurring" | "reservation";
}

const DAYS_EL = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const MONTHS_EL = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DAYS_EL[d.getDay()]} ${d.getDate()} ${MONTHS_EL[d.getMonth()]}`;
}

export default function MemberSchedule({
  memberName, memberId, sessions, pendingRequestKeys,
}: {
  memberName: string;
  memberId: string;
  sessions: Session[];
  pendingRequestKeys: string[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<{ session: Session; mode: "cancel" | "reschedule" } | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null); // key of just-submitted

  const pendingSet = new Set(pendingRequestKeys);

  const today = new Date().toISOString().slice(0, 10);

  async function submitRequest() {
    if (!modal) return;
    setSubmitting(true);
    const res = await fetch("/api/member/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        type: modal.mode === "cancel" ? "CANCEL" : "RESCHEDULE",
        sessionDate: modal.session.date,
        sessionTime: modal.session.time,
        newDate: modal.mode === "reschedule" ? newDate : null,
        newTime: modal.mode === "reschedule" ? newTime : null,
        note,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const key = `${modal.session.date}_${modal.session.time}`;
      setSubmitted(key);
      setModal(null);
      setNote("");
      setNewDate("");
      setNewTime("");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Γεια, {memberName} 👋</h1>
        <p className="text-sm mt-1" style={{ color: "#71717a" }}>Οι επόμενες 30 μέρες του προγράμματός σου</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#52525b" }}>Δεν υπάρχουν προγραμματισμένες προπονήσεις</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s, i) => {
            const key = `${s.date}_${s.time}`;
            const isPending = pendingSet.has(key) || submitted === key;
            const isPast = s.date < today;

            return (
              <div key={i} className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ backgroundColor: isPending ? "#f9431610" : "#141414", border: `1px solid ${isPending ? "#f9431640" : "#1e1e1e"}` }}>

                {/* Date */}
                <div className="w-28 flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: isPast ? "#52525b" : "#f4f4f5" }}>{formatDate(s.date)}</p>
                  <p className="text-xs mt-0.5 font-bold" style={{ color: "#f97316" }}>{s.time}</p>
                </div>

                {/* Type */}
                <div className="flex-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: s.type === "recurring" ? "#10b98115" : "#f9731615", color: s.type === "recurring" ? "#10b981" : "#f97316" }}>
                    {s.type === "recurring" ? "Σταθερή" : "Κράτηση"}
                  </span>
                </div>

                {/* Status / Actions */}
                {isPending ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#f9431615", color: "#f94316" }}>
                    ⏳ Εκκρεμεί έγκριση
                  </span>
                ) : isPast ? (
                  <span className="text-xs" style={{ color: "#3f3f46" }}>Παρελθόν</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setModal({ session: s, mode: "reschedule" }); setNote(""); setNewDate(""); setNewTime(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f9731620"; (e.currentTarget as HTMLElement).style.color = "#f97316"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
                    >
                      Μεταφορά
                    </button>
                    <button
                      onClick={() => { setModal({ session: s, mode: "cancel" }); setNote(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ backgroundColor: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#ef444415"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
                    >
                      Ακύρωση
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>

            <div>
              <h2 className="font-bold text-white text-lg">
                {modal.mode === "cancel" ? "Αίτημα ακύρωσης" : "Αίτημα μεταφοράς"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                {formatDate(modal.session.date)} · {modal.session.time}
              </p>
            </div>

            {modal.mode === "reschedule" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Νέα ημερομηνία</label>
                  <input type="date" value={newDate} min={today}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Νέα ώρα</label>
                  <input type="time" value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Σχόλιο <span style={{ color: "#52525b" }}>(προαιρετικό)</span></label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="π.χ. Ταξίδι, δουλειά..."
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={submitRequest} disabled={submitting || (modal.mode === "reschedule" && (!newDate || !newTime))}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: modal.mode === "cancel" ? "#ef4444" : "#f97316", color: "#fff" }}>
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
