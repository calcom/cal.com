-- CreateEnum
CREATE TYPE "public"."PolicyType" AS ENUM ('PRIVACY_POLICY');

-- CreateTable
CREATE TABLE "public"."policy_versions" (
    "version" TIMESTAMP(6) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "type" "public"."PolicyType" NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "public"."user_policy_acceptances" (
    "userId" INTEGER NOT NULL,
    "policyVersion" TIMESTAMP(6) NOT NULL,
    "policyType" "public"."PolicyType" NOT NULL,
    "acceptedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_policy_acceptances_pkey" PRIMARY KEY ("userId","policyVersion","policyType")
);

-- CreateIndex
CREATE INDEX "policy_versions_version_idx" ON "public"."policy_versions"("version" DESC);

-- CreateIndex
CREATE INDEX "policy_versions_type_version_idx" ON "public"."policy_versions"("type", "version" DESC);

-- CreateIndex
CREATE INDEX "policy_versions_publishedAt_idx" ON "public"."policy_versions"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_version_type_key" ON "public"."policy_versions"("version", "type");

-- CreateIndex
CREATE INDEX "user_policy_acceptances_userId_policyType_idx" ON "public"."user_policy_acceptances"("userId", "policyType");

-- CreateIndex
CREATE INDEX "user_policy_acceptances_policyVersion_policyType_idx" ON "public"."user_policy_acceptances"("policyVersion", "policyType");

-- CreateIndex
CREATE INDEX "user_policy_acceptances_acceptedAt_idx" ON "public"."user_policy_acceptances"("acceptedAt");

-- AddForeignKey
ALTER TABLE "public"."policy_versions" ADD CONSTRAINT "policy_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_policy_acceptances" ADD CONSTRAINT "user_policy_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_policy_acceptances" ADD CONSTRAINT "user_policy_acceptances_policyVersion_policyType_fkey" FOREIGN KEY ("policyVersion", "policyType") REFERENCES "public"."policy_versions"("version", "type") ON DELETE CASCADE ON UPDATE CASCADE;
