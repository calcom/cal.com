-- AlterTable
ALTER TABLE "public"."OrganizationSettings" ADD COLUMN     "disableAttendeeAwaitingPaymentEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeCancellationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeConfirmationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeLocationChangeEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeNewEventEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeReassignedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeRequestEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeRescheduleRequestEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableAttendeeRescheduledEmail" BOOLEAN NOT NULL DEFAULT false;
