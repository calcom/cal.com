/*
  Warnings:

  - You are about to drop the column `orgId` on the `DSyncTeamGroupMapping` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `DSyncTeamGroupMapping` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DSyncTeamGroupMapping" DROP COLUMN "orgId",
ADD COLUMN     "organizationId" INTEGER NOT NULL;
