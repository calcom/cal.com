/*
  Warnings:

  - You are about to drop the `ResetPasswordRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "timeZone" TEXT;

-- DropTable
DROP TABLE "ResetPasswordRequest";

-- CreateTable
CREATE TABLE "Availability" (
    "id" SERIAL NOT NULL,
    "label" TEXT,
    "userId" INTEGER,
    "eventTypeId" INTEGER,
    "days" INTEGER[],
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "date" DATE,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Availability" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
