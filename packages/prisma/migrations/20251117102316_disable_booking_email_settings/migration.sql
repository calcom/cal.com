-- AlterTable
ALTER TABLE "public"."OrganizationSettings" ADD COLUMN     "disableGuestCancellationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableGuestConfirmationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableGuestRequestEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableGuestRescheduledEmail" BOOLEAN NOT NULL DEFAULT false;
