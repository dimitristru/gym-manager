import { db } from "@/lib/db";
import Link from "next/link";
import SubscriptionsTable from "./SubscriptionsTable";

async function getData() {
  const [subscriptions, plans] = await Promise.all([
    db.subscription.findMany({
      include: {
        member: { include: { user: true } },
        plan: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
  ]);
  return { subscriptions, plans };
}

export default async function SubscriptionsPage() {
  const { subscriptions, plans } = await getData();

  const serialized = subscriptions.map((s) => ({
    id: s.id,
    status: s.status,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    member: { id: s.member.id, user: { name: s.member.user.name } },
    plan: { name: s.plan.name, price: s.plan.price.toString() },
    payments: s.payments.map((p) => ({ amount: p.amount.toString() })),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Συνδρομές</h1>
          <p className="text-slate-500 text-sm mt-1">{subscriptions.length} συνολικά</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/subscriptions/plans"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Πακέτα
          </Link>
          <Link
            href="/dashboard/subscriptions/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Νέα συνδρομή
          </Link>
        </div>
      </div>

      {plans.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Δεν υπάρχουν ενεργά πακέτα.{" "}
          <Link href="/dashboard/subscriptions/plans" className="font-semibold underline">
            Δημιούργησε πακέτα πρώτα →
          </Link>
        </div>
      )}

      <SubscriptionsTable initialSubs={serialized} />
    </div>
  );
}
