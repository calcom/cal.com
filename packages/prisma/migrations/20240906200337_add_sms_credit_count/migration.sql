-- CreateEnum
CREATE TYPE "SmsCreditAllocationType" AS ENUM ('ALL', 'NONE', 'SPECIFIC');

-- DropIndex
DROP INDEX "WorkflowReminder_cancelled_scheduledDate_idx";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "smsCreditAllocationType" "SmsCreditAllocationType" NOT NULL DEFAULT 'SPECIFIC',
ADD COLUMN     "smsCreditAllocationValue" INTEGER DEFAULT 50;

-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "smsCredits" INTEGER,
ADD COLUMN     "teamId" INTEGER;

-- CreateTable
CREATE TABLE "SmsCountryCredits" (
    "id" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SmsCountryCredits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCreditCount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "month" TIMESTAMP(3) NOT NULL,
    "limitReached" BOOLEAN,
    "warningSent" BOOLEAN,

    CONSTRAINT "SmsCreditCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsCountryCredits_id_key" ON "SmsCountryCredits"("id");

-- CreateIndex
CREATE INDEX "WorkflowReminder_teamId_cancelled_scheduledDate_idx" ON "WorkflowReminder"("teamId", "cancelled", "scheduledDate");

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
