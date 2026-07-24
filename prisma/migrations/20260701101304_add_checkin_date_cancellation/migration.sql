/*
  Warnings:

  - Added the required column `date` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `CheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MemberReservation" ADD COLUMN     "movedFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MemberCancellation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionTime" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "wasRescheduled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MemberCancellation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberCancellation" ADD CONSTRAINT "MemberCancellation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
