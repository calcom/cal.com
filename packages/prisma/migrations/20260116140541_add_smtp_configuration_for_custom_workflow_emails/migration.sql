-- CreateEnum
CREATE TYPE "public"."SmtpConfigurationStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "public"."SmtpConfiguration" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpUser" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."SmtpConfigurationStatus" NOT NULL DEFAULT 'PENDING',
    "lastTestedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmtpConfiguration_organizationId_idx" ON "public"."SmtpConfiguration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SmtpConfiguration_organizationId_fromEmail_key" ON "public"."SmtpConfiguration"("organizationId", "fromEmail");

-- AddForeignKey
ALTER TABLE "public"."SmtpConfiguration" ADD CONSTRAINT "SmtpConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
