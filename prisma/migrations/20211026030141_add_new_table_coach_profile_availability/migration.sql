-- CreateTable
CREATE TABLE "CoachProfileAvailability" (
    "id" SERIAL NOT NULL,
    "coachProfileId" INTEGER,
    "days" INTEGER[],
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "customizedWeek" INTEGER NOT NULL,
    "customizedYear" INTEGER NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "CoachProfileAvailability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoachProfileAvailability" ADD CONSTRAINT "CoachProfileAvailability_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
