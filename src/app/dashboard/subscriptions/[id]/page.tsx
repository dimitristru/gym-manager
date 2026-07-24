import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "@/lib/utils";
import { parseWeeklyDays, countClassesInMonth } from "@/lib/personalized";
import AddPaymentForm from "./AddPaymentForm";

async function getSubscription(id: string) {
  return db.subscription.findUnique({
    where: { id },
    include: {
      member: { include: { user: true } },
      plan: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
}

const statusLabel: Record<string, string> = { ACTIVE: "Ενεργή", EXPIRED: "Ληγμένη", CANCELLED: "Ανενεργή", PENDING: "Εκκρεμής" };
const statusStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-100 text-red-600",
  PENDING: "bg-amber-100 text-amber-700",
};
const methodLabel: Record<string, string> = { CASH: "Μετρητά", CARD: "Κάρτα", BANK_TRANSFER: "Τράπεζα" };

export default async function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = await getSubscription(id);
  if (!sub) notFound();

  // For personalized plans, calculate the monthly cost based on member's weekly schedule
  let planPrice = Number(sub.plan.price);
  let classCount: number | null = null;

  if (sub.plan.isPersonalized && sub.plan.pricePerClass) {
    const days = parseWeeklyDays(sub.member.weeklyDays);
    const startMonth = sub.startDate.getMonth() + 1;
    const startYear = sub.startDate.getFullYear();
    classCount = countClassesInMonth(startYear, startMonth, days);
    planPrice = classCount * Number(sub.plan.pricePerClass);
  }

  const totalPaid = sub.payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = planPrice - totalPaid;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/subscriptions" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Πίσω στις συνδρομές
      </Link>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">Συνδρομή για</p>
            <Link href={`/dashboard/members/${sub.member.id}`} className="text-xl font-bold text-slate-900 hover:text-blue-600">
              {sub.member.user.name}
            </Link>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${statusStyle[sub.status]}`}>
            {statusLabel[sub.status]}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΠΑΚΕΤΟ</p>
            <Link href={`/dashboard/subscriptions/plans`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-1 group">
              {sub.plan.name}
              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </Link>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΕΝΑΡΞΗ</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{format.date(sub.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΛΗΞΗ</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{format.date(sub.endDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 tracking-wider font-medium">ΜΑΘΗΜΑΤΑ</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {sub.plan.isPersonalized
                ? classCount !== null ? `${classCount} μαθ. × ${format.currency(sub.plan.pricePerClass!)}` : "—"
                : sub.classesLeft == null ? "Απεριόριστα" : `${sub.classesLeft} απομένουν`}
            </p>
          </div>
        </div>

        {/* Personalized breakdown */}
        {sub.plan.isPersonalized && classCount !== null && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Προσωποποιημένο πακέτο · {classCount} μαθήματα ×{" "}
            {format.currency(sub.plan.pricePerClass!)} ={" "}
            <span className="font-semibold text-slate-900">{format.currency(planPrice)}</span>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "ΑΞΙΑ ΠΑΚΕΤΟΥ", value: format.currency(planPrice), color: "text-slate-900" },
          { label: "ΠΛΗΡΩΜΕΝΟ", value: format.currency(totalPaid), color: "text-emerald-600" },
          { label: "ΥΠΟΛΟΙΠΟ", value: format.currency(Math.max(0, remaining)), color: remaining > 0 ? "text-red-600" : "text-emerald-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl p-5">
            <p className="text-xs text-slate-400 tracking-wider font-medium">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Payments */}
        <div className="rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Ιστορικό πληρωμών</h2>
          {sub.payments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Καμία πληρωμή ακόμα</p>
          ) : (
            <div className="space-y-3">
              {sub.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{format.currency(p.amount)}</p>
                    <p className="text-xs text-slate-400">{format.date(p.paidAt)} · {methodLabel[p.method]}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add payment — always show if subscription is active */}
        {sub.status === "ACTIVE" && (
          <AddPaymentForm subscriptionId={id} remaining={Math.max(0, remaining)} planPrice={planPrice} />
        )}
      </div>
    </div>
  );
}
