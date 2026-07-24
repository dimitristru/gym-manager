import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "Εκκρεμεί",   color: "#f97316", bg: "#f9731615" },
  APPROVED: { label: "Εγκρίθηκε",  color: "#10b981", bg: "#10b98115" },
  REJECTED: { label: "Απορρίφθηκε", color: "#ef4444", bg: "#ef444415" },
};

const typeLabel: Record<string, string> = {
  CANCEL:     "Ακύρωση",
  RESCHEDULE: "Μεταφορά",
};

const DAYS_EL = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const MONTHS_EL = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function fmtDate(d: Date) {
  return `${DAYS_EL[d.getDay()]} ${d.getDate()} ${MONTHS_EL[d.getMonth()]}`;
}

export default async function MemberRequestsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const member = await db.member.findFirst({
    where: { user: { email: session.user.email! } },
  });
  if (!member) redirect("/member");

  const requests = await db.scheduleChangeRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Τα αιτήματά μου</h1>
        <p className="text-sm mt-1" style={{ color: "#71717a" }}>Ιστορικό αιτημάτων αλλαγής προγράμματος</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#52525b" }}>Δεν έχεις υποβάλει κανένα αίτημα ακόμα</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const st = statusLabel[r.status] ?? statusLabel.PENDING;
            return (
              <div key={r.id} className="rounded-2xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{typeLabel[r.type]}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#71717a" }}>
                      {fmtDate(r.sessionDate)} · {r.sessionTime}
                    </p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: "#3f3f46" }}>
                    {r.createdAt.toLocaleDateString("el-GR")}
                  </p>
                </div>

                {r.type === "RESCHEDULE" && r.newDate && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f9731610", color: "#f97316" }}>
                    → {fmtDate(r.newDate)} · {r.newTime ?? "—"}
                  </p>
                )}
                {r.note && (
                  <p className="text-xs mt-2" style={{ color: "#71717a" }}>"{r.note}"</p>
                )}
                {r.reviewNote && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a1a1a", color: "#a1a1aa" }}>
                    Admin: "{r.reviewNote}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
