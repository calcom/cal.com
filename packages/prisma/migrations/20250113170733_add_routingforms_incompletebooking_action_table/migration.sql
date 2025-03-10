-- CreateEnum
CREATE TYPE "IncompleteBookingActionType" AS ENUM ('SALESFORCE');

-- CreateTable
CREATE TABLE "App_RoutingForms_IncompleteBookingActions" (
    "id" SERIAL NOT NULL,
    "formId" TEXT NOT NULL,
    "actionType" "IncompleteBookingActionType" NOT NULL,
    "data" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentialId" INTEGER,

    CONSTRAINT "App_RoutingForms_IncompleteBookingActions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "App_RoutingForms_IncompleteBookingActions" ADD CONSTRAINT "App_RoutingForms_IncompleteBookingActions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
