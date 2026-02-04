-- CreateEnum
CREATE TYPE "public"."BookingAuditType" AS ENUM ('record_created', 'record_updated', 'record_deleted');

-- CreateEnum
CREATE TYPE "public"."BookingAuditAction" AS ENUM ('created', 'cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host', 'rescheduled', 'attendee_added', 'attendee_removed', 'reassignment', 'location_changed', 'host_no_show_updated', 'attendee_no_show_updated', 'reschedule_requested');

-- CreateEnum
CREATE TYPE "public"."AuditActorType" AS ENUM ('user', 'guest', 'attendee', 'system');

-- CreateTable
CREATE TABLE "public"."AuditActor" (
    "id" TEXT NOT NULL,
    "type" "public"."AuditActorType" NOT NULL,
    "userUuid" UUID,
    "attendeeId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingAudit" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "public"."BookingAuditType" NOT NULL,
    "action" "public"."BookingAuditAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "data" JSONB,

    CONSTRAINT "BookingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditActor_email_idx" ON "public"."AuditActor"("email");

-- CreateIndex
CREATE INDEX "AuditActor_userUuid_idx" ON "public"."AuditActor"("userUuid");

-- CreateIndex
CREATE INDEX "AuditActor_attendeeId_idx" ON "public"."AuditActor"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_userUuid_key" ON "public"."AuditActor"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_attendeeId_key" ON "public"."AuditActor"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_email_key" ON "public"."AuditActor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_phone_key" ON "public"."AuditActor"("phone");

-- CreateIndex
CREATE INDEX "BookingAudit_actorId_idx" ON "public"."BookingAudit"("actorId");

-- CreateIndex
CREATE INDEX "BookingAudit_bookingUid_idx" ON "public"."BookingAudit"("bookingUid");

-- CreateIndex
CREATE INDEX "BookingAudit_timestamp_idx" ON "public"."BookingAudit"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."BookingAudit" ADD CONSTRAINT "BookingAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."AuditActor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
