/*
  Warnings:

  - Added the required column `calIdTeamId` to the `InstantMeetingToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoundRobinResetInterval" AS ENUM ('MONTH', 'DAY');

-- CreateEnum
CREATE TYPE "RoundRobinTimestampBasis" AS ENUM ('CREATED_AT', 'START_TIME');

-- AlterTable
ALTER TABLE "CalIdTeam" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "roundRobinResetInterval" "RoundRobinResetInterval" DEFAULT 'MONTH',
ADD COLUMN     "roundRobinTimestampBasis" "RoundRobinTimestampBasis" DEFAULT 'CREATED_AT';

-- AlterTable
ALTER TABLE "InstantMeetingToken" ADD COLUMN     "calIdTeamId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
