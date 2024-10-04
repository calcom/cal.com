-- CreateEnum
CREATE TYPE "SmsCreditAllocationType" AS ENUM ('ALL', 'NONE', 'SPECIFIC');

-- DropIndex
DROP INDEX "WorkflowReminder_cancelled_scheduledDate_idx";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "smsCreditAllocationType" "SmsCreditAllocationType" NOT NULL DEFAULT 'SPECIFIC',
ADD COLUMN     "smsCreditAllocationValue" INTEGER DEFAULT 50,
ADD COLUMN     "smsOverageLimit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "smsCredits" INTEGER;

-- CreateTable
CREATE TABLE "SmsCreditCount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "month" TIMESTAMP(3) NOT NULL,
    "overageCharges" INTEGER NOT NULL DEFAULT 0,
    "limitReached" BOOLEAN,
    "warningSent" BOOLEAN,

    CONSTRAINT "SmsCreditCount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
