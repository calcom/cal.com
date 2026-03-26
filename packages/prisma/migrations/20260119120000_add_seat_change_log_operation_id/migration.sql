/*
  Warnings:

  - A unique constraint covering the columns `[teamId,operationId]` on the table `SeatChangeLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."SeatChangeLog" ADD COLUMN     "operationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SeatChangeLog_teamId_operationId_key" ON "public"."SeatChangeLog"("teamId", "operationId");
