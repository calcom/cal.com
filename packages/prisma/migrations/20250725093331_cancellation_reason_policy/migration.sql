-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "mandatoryCancellationReasonForAttendee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mandatoryCancellationReasonForHost" BOOLEAN NOT NULL DEFAULT true;
