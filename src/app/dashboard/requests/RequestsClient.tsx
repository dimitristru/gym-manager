"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScheduleRequest {
  id: string;
  memberName: string;
  type: "CANCEL" | "RESCHEDULE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  sessionDate: string;
  sessionTime: string;
  newDate: string | null;
  newTime: string | null;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
}

interface SubRequest {
  id: string;
  memberName: string;
  type: "NEW" | "CANCEL_SUB";
  planName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const DAYS_EL = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const MONTHS_EL = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DAYS_EL[d.getDay()]} ${d.getDate()} ${MONTHS_EL[d.getMonth()]}`;
}

function ActionButtons({ id, apiPath, onDone }: { id: string; apiPath: string; onDone: () => void }) {
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    const res = await fetch(`${apiPath}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote }),
    });
    setLoading(null);
    if (res.ok) onDone();
  }

  return (
    <div className="space-y-2 pt-3 border-t" style={{ borderColor: "#1e1e1e" }}>
      <input type="text" placeholder="Σχόλιο (προαιρετικό)" value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }} />
      <div className="flex gap-2">
        <button onClick={() => act("approve")} disabled={!!loading}
          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ backgroundColor: "#10b981", color: "#fff" }}>
          {loading === "approve" ? "..." : "✓ Έγκριση"}
        </button>
        <button onClick={() => act("reject")} disabled={!!loading}
          className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ backgroundColor: "#ef4444", color: "#fff" }}>
          {loading === "reject" ? "..." : "✕ Απόρριψη"}
        </button>
      </div>
    </div>
  );
}

function ScheduleCard({ req, onDone }: { req: ScheduleRequest; onDone?: (id: string) => void }) {
  const isPending = req.status === "PENDING";
  return (
    <div className="rounded-2xl p-5" style={{
      backgroundColor: "#141414",
      border: `1px solid ${isPending ? "#f9731640" : req.status === "APPROVED" ? "#10b98130" : "#ef444430"}`,
    }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{req.memberName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.type === "CANCEL" ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}`}>
              {req.type === "CANCEL" ? "Ακύρωση" : "Μεταφορά"}
            </span>
            {!isPending && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {req.status === "APPROVED" ? "Εγκρίθηκε" : "Απορρίφθηκε"}
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>{fmtDate(req.sessionDate)} · {req.sessionTime}</p>
        </div>
        <p className="text-xs flex-shrink-0" style={{ color: "#3f3f46" }}>
          {new Date(req.createdAt).toLocaleDateString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {req.type === "RESCHEDULE" && req.newDate && (
        <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: "#f9731610", color: "#f97316" }}>
          → {fmtDate(req.newDate)} · {req.newTime ?? "—"}
        </p>
      )}
      {req.note && <p className="text-xs mb-3 px-3 py-2 rounded-lg italic" style={{ backgroundColor: "#1a1a1a", color: "#a1a1aa" }}>"{req.note}"</p>}
      {req.reviewNote && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a1a1a", color: "#71717a" }}>Admin: "{req.reviewNote}"</p>}
      {isPending && onDone && (
        <ActionButtons id={req.id} apiPath="/api/admin/requests" onDone={() => onDone(req.id)} />
      )}
    </div>
  );
}

function SubCard({ req, onDone }: { req: SubRequest; onDone?: (id: string) => void }) {
  const isPending = req.status === "PENDING";
  return (
    <div className="rounded-2xl p-5" style={{
      backgroundColor: "#141414",
      border: `1px solid ${isPending ? "#a855f740" : req.status === "APPROVED" ? "#10b98130" : "#ef444430"}`,
    }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{req.memberName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.type === "NEW" ? "bg-purple-500/10 text-purple-400" : "bg-red-500/10 text-red-400"}`}>
              {req.type === "NEW" ? "Νέο πακέτο" : "Ακύρωση συνδρομής"}
            </span>
            {req.planName && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{req.planName}</span>}
            {!isPending && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {req.status === "APPROVED" ? "Εγκρίθηκε" : "Απορρίφθηκε"}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs flex-shrink-0" style={{ color: "#3f3f46" }}>
          {new Date(req.createdAt).toLocaleDateString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {req.note && <p className="text-xs mb-3 px-3 py-2 rounded-lg italic" style={{ backgroundColor: "#1a1a1a", color: "#a1a1aa" }}>"{req.note}"</p>}
      {req.reviewNote && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a1a1a", color: "#71717a" }}>Admin: "{req.reviewNote}"</p>}
      {isPending && onDone && (
        <ActionButtons id={req.id} apiPath="/api/admin/subscription-requests" onDone={() => onDone(req.id)} />
      )}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
      <span className="text-xs font-bold tracking-widest" style={{ color: "#52525b" }}>{label}</span>
      <div className="h-px flex-1" style={{ backgroundColor: "#1e1e1e" }} />
    </div>
  );
}

export default function RequestsClient({
  pending, history, pendingSub, historySub,
}: {
  pending: ScheduleRequest[];
  history: ScheduleRequest[];
  pendingSub: SubRequest[];
  historySub: SubRequest[];
}) {
  const router = useRouter();
  const [scheduleItems, setScheduleItems] = useState(pending);
  const [subItems, setSubItems] = useState(pendingSub);

  const totalPending = scheduleItems.length + subItems.length;

  function removeSchedule(id: string) {
    setScheduleItems((p) => p.filter((r) => r.id !== id));
    router.refresh();
  }
  function removeSub(id: string) {
    setSubItems((p) => p.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Αιτήματα</h1>
        {totalPending > 0 && (
          <span className="px-2.5 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: "#ef4444", color: "#fff" }}>
            {totalPending}
          </span>
        )}
      </div>

      {/* Schedule requests */}
      {scheduleItems.length > 0 && (
        <>
          <p className="text-xs font-bold mb-3 tracking-wider" style={{ color: "#52525b" }}>ΑΛΛΑΓΕΣ ΠΡΟΓΡΑΜΜΑΤΟΣ</p>
          <div className="space-y-3">
            {scheduleItems.map((r) => <ScheduleCard key={r.id} req={r} onDone={removeSchedule} />)}
          </div>
        </>
      )}

      {/* Subscription requests */}
      {subItems.length > 0 && (
        <>
          {scheduleItems.length > 0 && <div className="mt-6" />}
          <p className="text-xs font-bold mb-3 tracking-wider" style={{ color: "#52525b" }}>ΑΙΤΗΜΑΤΑ ΣΥΝΔΡΟΜΗΣ</p>
          <div className="space-y-3">
            {subItems.map((r) => <SubCard key={r.id} req={r} onDone={removeSub} />)}
          </div>
        </>
      )}

      {totalPending === 0 && (
        <div className="rounded-2xl p-8 text-center mb-6" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
          <p className="text-sm" style={{ color: "#52525b" }}>Δεν υπάρχουν εκκρεμή αιτήματα</p>
        </div>
      )}

      {/* History */}
      {(history.length > 0 || historySub.length > 0) && (
        <>
          <SectionDivider label="Ιστορικό" />
          {history.length > 0 && (
            <div className="space-y-2 mb-4">
              {history.map((r) => <ScheduleCard key={r.id} req={r} />)}
            </div>
          )}
          {historySub.length > 0 && (
            <div className="space-y-2">
              {historySub.map((r) => <SubCard key={r.id} req={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
