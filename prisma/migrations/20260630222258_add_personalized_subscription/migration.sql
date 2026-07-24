-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "weeklyDays" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "isPersonalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricePerClass" DECIMAL(10,2);
