import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [schedPending, subPending] = await Promise.all([
    db.scheduleChangeRequest.count({ where: { status: "PENDING" } }),
    db.subscriptionRequest.count({ where: { status: "PENDING" } }),
  ]);
  const pendingCount = schedPending + subPending;

  return (
    <DashboardShell user={session.user ?? {}} pendingCount={pendingCount}>
      {children}
    </DashboardShell>
  );
}
