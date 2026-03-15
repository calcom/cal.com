-- CreateEnum
CREATE TYPE "public"."AbuseRuleAuditAction" AS ENUM ('created', 'updated', 'deleted');

-- CreateTable
CREATE TABLE "public"."AbuseRuleGroup" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "matchAll" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL,
    "autoLock" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbuseRuleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbuseRuleCondition" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "groupId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbuseRuleCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbuseScoringConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "alertThreshold" INTEGER NOT NULL DEFAULT 50,
    "lockThreshold" INTEGER NOT NULL DEFAULT 80,
    "monitoringWindowDays" INTEGER NOT NULL DEFAULT 7,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbuseScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbuseRuleAudit" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "ruleGroupId" UUID,
    "action" "public"."AbuseRuleAuditAction" NOT NULL,
    "details" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseRuleAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAbuseSignal" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "abuseScoreId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAbuseSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbuseRuleCondition_groupId_idx" ON "public"."AbuseRuleCondition"("groupId");

-- CreateIndex
CREATE INDEX "AbuseRuleAudit_ruleGroupId_idx" ON "public"."AbuseRuleAudit"("ruleGroupId");

-- CreateIndex
CREATE INDEX "AbuseRuleAudit_createdById_idx" ON "public"."AbuseRuleAudit"("createdById");

-- CreateIndex
CREATE INDEX "UserAbuseSignal_abuseScoreId_idx" ON "public"."UserAbuseSignal"("abuseScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAbuseSignal_abuseScoreId_type_key" ON "public"."UserAbuseSignal"("abuseScoreId", "type");

-- CreateIndex
CREATE INDEX "UserAbuseScore_lockedAt_idx" ON "public"."UserAbuseScore"("lockedAt");

-- AddForeignKey
ALTER TABLE "public"."AbuseRuleCondition" ADD CONSTRAINT "AbuseRuleCondition_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."AbuseRuleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAbuseSignal" ADD CONSTRAINT "UserAbuseSignal_abuseScoreId_fkey" FOREIGN KEY ("abuseScoreId") REFERENCES "public"."UserAbuseScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
