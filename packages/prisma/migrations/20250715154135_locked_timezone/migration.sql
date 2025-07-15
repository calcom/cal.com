-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "lockedTimeZone" DROP NOT NULL,
ALTER COLUMN "lockedTimeZone" DROP DEFAULT;
