-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('login', 'password_changed', 'password_reset_requested', 'two_factor_enabled', 'two_factor_disabled', 'impersonation_start', 'impersonation_stop', 'email_changed', 'account_locked', 'account_unlocked', 'member_added', 'member_removed', 'role_changed', 'api_key_created', 'api_key_revoked', 'workflow_created', 'workflow_modified', 'workflow_deleted');

-- CreateEnum
CREATE TYPE "public"."AuditCategory" AS ENUM ('security', 'access', 'billing', 'data');

-- CreateEnum
CREATE TYPE "public"."AuditRetentionTier" AS ENUM ('standard', 'extended');

-- CreateEnum
CREATE TYPE "public"."AuditResult" AS ENUM ('success', 'failure', 'denied');

-- CreateEnum
CREATE TYPE "public"."AuditVisibility" AS ENUM ('customer_visible', 'internal_only');

-- CreateEnum
CREATE TYPE "public"."AuditSensitivity" AS ENUM ('none', 'pseudonymized', 'identified');

-- CreateEnum
CREATE TYPE "public"."AuditSource" AS ENUM ('api_v1', 'api_v2', 'webapp', 'webhook', 'system', 'magic_link', 'saml', 'oauth', 'unknown');

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "actorId" UUID NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "result" "public"."AuditResult" NOT NULL DEFAULT 'success',
    "category" "public"."AuditCategory" NOT NULL,
    "source" "public"."AuditSource" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationId" TEXT NOT NULL,
    "orgId" INTEGER,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "traceId" TEXT,
    "impersonatedBy" UUID,
    "visibility" "public"."AuditVisibility" NOT NULL DEFAULT 'customer_visible',
    "sensitivityLevel" "public"."AuditSensitivity" NOT NULL DEFAULT 'none',
    "retentionTier" "public"."AuditRetentionTier" NOT NULL DEFAULT 'standard',
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_createdAt_idx" ON "public"."AuditEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_action_createdAt_idx" ON "public"."AuditEvent"("orgId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "public"."AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_operationId_idx" ON "public"."AuditEvent"("operationId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "public"."AuditEvent"("createdAt");

-- CheckConstraints
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_target_both_or_neither"
  CHECK (("targetType" IS NULL) = ("targetId" IS NULL));

ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_operationId_not_empty"
  CHECK (length("operationId") > 0);

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."AuditActor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
