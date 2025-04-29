-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "multipleRRHosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "RRHostsPerMeeting" INTEGER NOT NULL DEFAULT 1;
