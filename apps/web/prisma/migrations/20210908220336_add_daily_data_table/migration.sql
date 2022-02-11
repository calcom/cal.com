-- CreateTable
CREATE TABLE "DailyEventReference" (
    "id" SERIAL NOT NULL,
    "dailyurl" TEXT NOT NULL DEFAULT E'dailycallurl',
    "dailytoken" TEXT NOT NULL DEFAULT E'dailytoken',
    "bookingId" INTEGER,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyEventReference_bookingId_unique" ON "DailyEventReference"("bookingId");

-- AddForeignKey
ALTER TABLE "DailyEventReference" ADD FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
