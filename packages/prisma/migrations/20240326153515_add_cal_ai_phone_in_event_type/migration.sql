-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "calAiPhoneScript" TEXT,
ADD COLUMN     "isCalAiPhoneCallEnabled" BOOLEAN NOT NULL DEFAULT false;
