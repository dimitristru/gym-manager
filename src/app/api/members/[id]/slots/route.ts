export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// PATCH /api/members/[id]/slots — admin can update any member; member can update own slots
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const email = session.user?.email;

  // If not admin, verify the member belongs to the logged-in user
  if (role !== "ADMIN") {
    const member = await db.member.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!member || member.user.email !== email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const { slots } = await req.json(); // WeeklySlot[]

  await db.member.update({
    where: { id },
    data: { weeklyDays: slots.length > 0 ? JSON.stringify(slots) : null },
  });

  return NextResponse.json({ ok: true });
}
