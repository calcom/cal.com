/*
  Warnings:

  - You are about to drop the column `rrResetInterval` on the `Team` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `App_RoutingForms_FormResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "deduplicateResponses" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN     "lastSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "responseHash" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "rrResetInterval";

-- DropEnum
DROP TYPE "RRResetInterval";

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_responseHash_idx" ON "App_RoutingForms_FormResponse"("responseHash");
