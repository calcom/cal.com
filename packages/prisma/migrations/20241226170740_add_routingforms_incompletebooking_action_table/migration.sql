-- CreateEnum
CREATE TYPE "IncompleteBookingActionType" AS ENUM ('SALESFORCE');

-- CreateTable
CREATE TABLE "App_RoutingForms_IncompleteBooking_Actions" (
    "id" SERIAL NOT NULL,
    "formId" TEXT NOT NULL,
    "actionType" "IncompleteBookingActionType" NOT NULL,
    "data" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentialId" INTEGER,

    CONSTRAINT "App_RoutingForms_IncompleteBooking_Actions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "App_RoutingForms_IncompleteBooking_Actions" ADD CONSTRAINT "App_RoutingForms_IncompleteBooking_Actions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_IncompleteBooking_Actions" ADD CONSTRAINT "App_RoutingForms_IncompleteBooking_Actions_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
