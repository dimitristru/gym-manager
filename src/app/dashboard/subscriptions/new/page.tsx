import { db } from "@/lib/db";
import NewSubscriptionForm from "./NewSubscriptionForm";

async function getData(memberId?: string) {
  const [members, plans] = await Promise.all([
    db.member.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
  ]);
  return {
    members,
    plans: plans.map((p) => ({
      ...p,
      price: p.price.toString(),
      pricePerClass: p.pricePerClass?.toString() ?? null,
    })),
    defaultMemberId: memberId,
  };
}

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const { memberId } = await searchParams;
  const { members, plans, defaultMemberId } = await getData(memberId);

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Νέα συνδρομή</h1>
        <p className="text-slate-500 text-sm mt-1">Ανάθεση πακέτου σε μέλος</p>
      </div>
      <NewSubscriptionForm members={members} plans={plans} defaultMemberId={defaultMemberId} />
    </div>
  );
}
