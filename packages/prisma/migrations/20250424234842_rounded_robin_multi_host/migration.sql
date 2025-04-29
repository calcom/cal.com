-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "multipleRRHosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rrHostsPerMeeting" INTEGER NOT NULL DEFAULT 1;
CHECK ("rrHostsPerMeeting" >= 1);
