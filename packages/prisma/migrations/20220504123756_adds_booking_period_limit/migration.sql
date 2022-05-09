-- CreateEnum
CREATE TYPE "BookingPeriodFrequency" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "BookingPeriodLimit" (
    "id" TEXT NOT NULL,
    "period" "BookingPeriodFrequency" NOT NULL,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "BookingPeriodLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingPeriodLimit_id_key" ON "BookingPeriodLimit"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPeriodLimit_eventTypeId_period_key" ON "BookingPeriodLimit"("eventTypeId", "period");

-- AddForeignKey
ALTER TABLE "BookingPeriodLimit" ADD CONSTRAINT "BookingPeriodLimit_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingPeriodLimit" ADD COLUMN     "limit" INTEGER NOT NULL;