import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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
    <div className="flex h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <Sidebar user={session.user ?? {}} pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#0f0f0f" }}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
