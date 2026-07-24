import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import MemberNav from "./MemberNav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role === "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <MemberNav userName={session.user.name ?? ""} />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
