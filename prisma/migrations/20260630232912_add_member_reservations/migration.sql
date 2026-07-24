-- CreateTable
CREATE TABLE "MemberReservation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberReservation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberReservation" ADD CONSTRAINT "MemberReservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
