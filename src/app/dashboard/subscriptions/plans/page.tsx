import { db } from "@/lib/db";
import NewPlanForm from "./NewPlanForm";
import PlansManager from "./PlansManager";

async function getPlans() {
  const plans = await db.subscriptionPlan.findMany({ orderBy: { createdAt: "asc" } });
  return plans.map((p) => ({
    ...p,
    price: p.price.toString(),
    pricePerClass: p.pricePerClass?.toString() ?? null,
  }));
}

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Πακέτα συνδρομών</h1>
        <p className="text-slate-500 text-sm mt-1">Διαχείριση τιμών και διαρκειών</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <PlansManager initialPlans={plans} />
        <div>
          <NewPlanForm />
        </div>
      </div>
    </div>
  );
}
