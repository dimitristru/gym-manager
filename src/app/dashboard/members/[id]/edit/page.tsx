import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditMemberForm from "./EditMemberForm";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.member.findUnique({ where: { id }, include: { user: true } });
  if (!member) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Επεξεργασία μέλους</h1>
        <p className="text-slate-500 text-sm mt-1">{member.user.name}</p>
      </div>
      <EditMemberForm member={{
        id: member.id,
        name: member.user.name,
        nickname: member.nickname ?? "",
        email: member.user.email,
        phone: member.user.phone ?? "",
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString().split("T")[0] : "",
        emergencyContact: member.emergencyContact ?? "",
        notes: member.notes ?? "",
        weeklyDays: member.weeklyDays ?? "",
      }} />
    </div>
  );
}
