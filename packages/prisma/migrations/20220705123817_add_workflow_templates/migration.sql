/*
  Warnings:

  - You are about to drop the column `sendTo` on the `WorkflowReminder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referenceId]` on the table `WorkflowReminder` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `method` on the `WorkflowReminder` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WorkflowTemplates" AS ENUM ('REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkflowMethods" AS ENUM ('EMAIL', 'SMS');

-- AlterTable
ALTER TABLE "WorkflowReminder" DROP COLUMN "sendTo",
DROP COLUMN "method",
ADD COLUMN     "method" "WorkflowMethods" NOT NULL;

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "template" "WorkflowTemplates" NOT NULL DEFAULT E'REMINDER';

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReminder_referenceId_key" ON "WorkflowReminder"("referenceId");
