/*
  Warnings:

  - The values [reassignment_reason_updated] on the enum `BookingAuditAction` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[attendeeId]` on the table `Actor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Actor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Actor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `BookingAudit` table without a default value. This is not possible if the table is not empty.
  - Made the column `action` on table `BookingAudit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "public"."ActorType" ADD VALUE 'attendee';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."BookingAuditAction_new" AS ENUM ('created', 'cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host', 'rescheduled', 'attendee_added', 'attendee_removed', 'cancellation_reason_updated', 'rejection_reason_updated', 'assignment_reason_updated', 'reassignment', 'location_changed', 'meeting_url_updated', 'host_no_show_updated', 'attendee_no_show_updated', 'reschedule_requested');
ALTER TABLE "public"."BookingAudit" ALTER COLUMN "action" TYPE "public"."BookingAuditAction_new" USING ("action"::text::"public"."BookingAuditAction_new");
ALTER TYPE "public"."BookingAuditAction" RENAME TO "BookingAuditAction_old";
ALTER TYPE "public"."BookingAuditAction_new" RENAME TO "BookingAuditAction";
DROP TYPE "public"."BookingAuditAction_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Actor" ADD COLUMN     "attendeeId" INTEGER;

-- AlterTable
ALTER TABLE "public"."BookingAudit" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "action" SET NOT NULL,
ALTER COLUMN "timestamp" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Actor_attendeeId_idx" ON "public"."Actor"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_attendeeId_key" ON "public"."Actor"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_email_key" ON "public"."Actor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_phone_key" ON "public"."Actor"("phone");

-- CreateIndex
CREATE INDEX "BookingAudit_timestamp_idx" ON "public"."BookingAudit"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."Actor" ADD CONSTRAINT "Actor_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "public"."Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
