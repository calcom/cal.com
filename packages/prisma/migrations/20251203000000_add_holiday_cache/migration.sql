-- CreateTable
CREATE TABLE "HolidayCache" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HolidayCache_countryCode_year_idx" ON "HolidayCache"("countryCode", "year");

-- CreateIndex
CREATE INDEX "HolidayCache_countryCode_date_idx" ON "HolidayCache"("countryCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCache_countryCode_eventId_key" ON "HolidayCache"("countryCode", "eventId");

