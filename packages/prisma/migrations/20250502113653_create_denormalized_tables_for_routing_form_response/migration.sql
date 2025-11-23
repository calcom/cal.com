-- CreateTable
CREATE TABLE "RoutingFormResponseField" (
    "id" SERIAL NOT NULL,
    "responseId" INTEGER NOT NULL,
    "fieldId" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DECIMAL(65,30),
    "valueStringArray" TEXT[],

    CONSTRAINT "RoutingFormResponseField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingFormResponseDenormalized" (
    "id" INTEGER NOT NULL,
    "formId" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "formTeamId" INTEGER,
    "formUserId" INTEGER NOT NULL,
    "bookingUid" TEXT,
    "bookingId" INTEGER,
    "bookingStatus" "BookingStatus",
    "bookingStatusOrder" INTEGER,
    "bookingCreatedAt" TIMESTAMP(3),
    "bookingStartTime" TIMESTAMP(3),
    "bookingEndTime" TIMESTAMP(3),
    "bookingUserId" INTEGER,
    "bookingUserName" TEXT,
    "bookingUserEmail" TEXT,
    "bookingUserAvatarUrl" TEXT,
    "bookingAssignmentReason" TEXT,
    "eventTypeId" INTEGER,
    "eventTypeParentId" INTEGER,
    "eventTypeSchedulingType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_response_fkey" FOREIGN KEY ("responseId") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for valueString (lowercase)
CREATE INDEX "RoutingFormResponseField_valueString_idx" ON "RoutingFormResponseField" (LOWER("valueString"));

-- CreateIndex
CREATE INDEX "RoutingFormResponseField_responseId_idx" ON "RoutingFormResponseField"("responseId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseField_fieldId_idx" ON "RoutingFormResponseField"("fieldId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseField_valueNumber_idx" ON "RoutingFormResponseField"("valueNumber");

-- CreateIndex
CREATE INDEX "RoutingFormResponseField_valueStringArray_idx" ON "RoutingFormResponseField" USING GIN ("valueStringArray");

-- Add index for bookingAssignmentReason (lowercase)
CREATE INDEX "RoutingFormResponseDenormalized_bookingAssignmentReason_idx" ON "RoutingFormResponseDenormalized" (LOWER("bookingAssignmentReason"));

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_formId_idx" ON "RoutingFormResponseDenormalized"("formId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_formTeamId_idx" ON "RoutingFormResponseDenormalized"("formTeamId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_formUserId_idx" ON "RoutingFormResponseDenormalized"("formUserId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_formId_createdAt_idx" ON "RoutingFormResponseDenormalized"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_bookingId_idx" ON "RoutingFormResponseDenormalized"("bookingId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_bookingUserId_idx" ON "RoutingFormResponseDenormalized"("bookingUserId");

-- CreateIndex
CREATE INDEX "RoutingFormResponseDenormalized_eventTypeId_eventTypeParent_idx" ON "RoutingFormResponseDenormalized"("eventTypeId", "eventTypeParentId");

-- AddForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" ADD CONSTRAINT "RoutingFormResponseDenormalized_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" ADD CONSTRAINT "RoutingFormResponseDenormalized_id_fkey" FOREIGN KEY ("id") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" ADD CONSTRAINT "RoutingFormResponseDenormalized_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
