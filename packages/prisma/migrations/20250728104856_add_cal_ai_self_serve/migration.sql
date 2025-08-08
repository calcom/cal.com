/*
  Warnings:

  - A unique constraint covering the columns `[agentId]` on the table `WorkflowStep` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PhoneNumberSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- AlterEnum
ALTER TYPE "WorkflowActions" ADD VALUE 'CAL_AI_PHONE_CALL';

-- AlterEnum
ALTER TYPE "WorkflowMethods" ADD VALUE 'AI_PHONE_CALL';

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "agentId" TEXT;

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "retellAgentId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalAiPhoneNumber" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "phoneNumber" TEXT NOT NULL,
    "provider" TEXT DEFAULT 'retell',
    "retellPhoneNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "PhoneNumberSubscriptionStatus",
    "inboundAgentId" TEXT,
    "outboundAgentId" TEXT,

    CONSTRAINT "CalAiPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_retellAgentId_key" ON "Agent"("retellAgentId");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_teamId_idx" ON "Agent"("teamId");

-- CreateIndex
CREATE INDEX "Agent_retellAgentId_idx" ON "Agent"("retellAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_phoneNumber_key" ON "CalAiPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_retellPhoneNumberId_key" ON "CalAiPhoneNumber"("retellPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_stripeSubscriptionId_key" ON "CalAiPhoneNumber"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_userId_idx" ON "CalAiPhoneNumber"("userId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_teamId_idx" ON "CalAiPhoneNumber"("teamId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_stripeSubscriptionId_idx" ON "CalAiPhoneNumber"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_inboundAgentId_idx" ON "CalAiPhoneNumber"("inboundAgentId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_outboundAgentId_idx" ON "CalAiPhoneNumber"("outboundAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_agentId_key" ON "WorkflowStep"("agentId");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_inboundAgentId_fkey" FOREIGN KEY ("inboundAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_outboundAgentId_fkey" FOREIGN KEY ("outboundAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
