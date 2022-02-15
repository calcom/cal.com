-- AlterTable
ALTER TABLE "users" ADD COLUMN     "completedOnboarding" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "eventTypeId" INTEGER,
    "title" TEXT,
    "freeBusyTimes" JSONB,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Schedule" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
