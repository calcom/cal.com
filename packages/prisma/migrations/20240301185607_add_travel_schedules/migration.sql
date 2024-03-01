-- CreateTable
CREATE TABLE "TravelSchedule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "prevTimeZone" TEXT,

    CONSTRAINT "TravelSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TravelSchedule" ADD CONSTRAINT "TravelSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
