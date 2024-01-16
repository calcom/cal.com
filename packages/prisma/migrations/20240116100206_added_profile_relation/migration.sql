-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN     "profileId" INTEGER,
ADD COLUMN     "toProfileId" INTEGER;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "VerifiedNumber" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "profileId" INTEGER;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedNumber" ADD CONSTRAINT "VerifiedNumber_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
