/*
  Warnings:

  - Added the required column `coachProgramId` to the `EventType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "coachProgramId" TEXT NOT NULL,
ALTER COLUMN "timeZone" SET DEFAULT E'Asia/Kuala_Lumpur';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT E'Asia/Kuala_Lumpur';
