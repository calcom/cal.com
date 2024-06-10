-- AlterTable
ALTER TABLE "AIPhoneCallConfiguration" ADD COLUMN     "schedulerName" TEXT,
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'CHECK_IN_APPPOINTMENT',
ALTER COLUMN "generalPrompt" DROP NOT NULL,
ALTER COLUMN "guestName" DROP NOT NULL;
