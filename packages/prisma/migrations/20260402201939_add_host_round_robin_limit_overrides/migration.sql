-- AlterTable
ALTER TABLE "public"."Host" ADD COLUMN     "overrideAfterEventBuffer" INTEGER,
ADD COLUMN     "overrideBeforeEventBuffer" INTEGER,
ADD COLUMN     "overrideBookingLimits" JSONB,
ADD COLUMN     "overrideDurationLimits" JSONB,
ADD COLUMN     "overrideMinimumBookingNotice" INTEGER,
ADD COLUMN     "overridePeriodCountCalendarDays" BOOLEAN,
ADD COLUMN     "overridePeriodDays" INTEGER,
ADD COLUMN     "overridePeriodEndDate" TIMESTAMP(3),
ADD COLUMN     "overridePeriodStartDate" TIMESTAMP(3),
ADD COLUMN     "overridePeriodType" "public"."PeriodType",
ADD COLUMN     "overrideSlotInterval" INTEGER;
