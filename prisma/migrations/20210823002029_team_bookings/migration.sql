/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "Team.slug_unique" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users.username_unique" ON "users"("username");

-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('roundRobin', 'collective');

ADD COLUMN     "schedulingType" "SchedulingType",
ADD COLUMN     "teamId" INTEGER;

-- CreateTable
CREATE TABLE "_user_eventtype" (
 "A" INTEGER NOT NULL,
 "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_user_eventtype_AB_unique" ON "_user_eventtype"("A", "B");

-- CreateIndex
CREATE INDEX "_user_eventtype_B_index" ON "_user_eventtype"("B");

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- CreateTable
CREATE TABLE "_user_booking" (
 "A" INTEGER NOT NULL,
 "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_user_booking_AB_unique" ON "_user_booking"("A", "B");

-- CreateIndex
CREATE INDEX "_user_booking_B_index" ON "_user_booking"("B");

-- AddForeignKey
ALTER TABLE "_user_booking" ADD FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_booking" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "Booking" ADD FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
