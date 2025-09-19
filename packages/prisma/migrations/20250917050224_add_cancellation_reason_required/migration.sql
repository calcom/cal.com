/*
  Warnings:

  - The primary key for the `_PlatformOAuthClientToUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_user_eventtype` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_PlatformOAuthClientToUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_user_eventtype` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CancellationReasonRequired" AS ENUM ('MANDATORY_FOR_BOTH', 'MANDATORY_FOR_HOST_ONLY', 'MANDATORY_FOR_ATTENDEE_ONLY', 'OPTIONAL_FOR_BOTH');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "cancellationReasonRequired" "CancellationReasonRequired" NOT NULL DEFAULT 'MANDATORY_FOR_HOST_ONLY';

-- AlterTable
ALTER TABLE "_PlatformOAuthClientToUser" DROP CONSTRAINT "_PlatformOAuthClientToUser_AB_pkey";

-- AlterTable
ALTER TABLE "_user_eventtype" DROP CONSTRAINT "_user_eventtype_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_PlatformOAuthClientToUser_AB_unique" ON "_PlatformOAuthClientToUser"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_user_eventtype_AB_unique" ON "_user_eventtype"("A", "B");
