import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import BookForm from "./BookForm";

async function getData(sessionId: string) {
  const [session, members] = await Promise.all([
    db.classSchedule.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        bookings: { where: { cancelled: false }, select: { memberId: true } },
      },
    }),
    db.member.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { session, members };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, members } = await getData(id);
  if (!session) notFound();

  const bookedMemberIds = new Set(session.bookings.map((b) => b.memberId));
  const availableMembers = members.filter((m) => !bookedMemberIds.has(m.id));

  return (
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Νέα κράτηση</h1>
        <p className="text-slate-500 text-sm mt-1">{session.class.name} — {new Date(session.startsAt).toLocaleDateString("el-GR", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </div>
      <BookForm sessionId={id} members={availableMembers.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email }))} />
    </div>
  );
}
