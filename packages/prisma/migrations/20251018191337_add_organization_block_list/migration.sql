-- CreateTable
CREATE TABLE "OrganizationBlockedEmail" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "reason" TEXT,
    "bookingReportId" UUID,

    CONSTRAINT "OrganizationBlockedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBlockedDomain" (
    "id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "reason" TEXT,
    "bookingReportId" UUID,

    CONSTRAINT "OrganizationBlockedDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationBlockedEmail_organizationId_idx" ON "OrganizationBlockedEmail"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBlockedEmail_email_organizationId_key" ON "OrganizationBlockedEmail"("email", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationBlockedDomain_organizationId_idx" ON "OrganizationBlockedDomain"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBlockedDomain_domain_organizationId_key" ON "OrganizationBlockedDomain"("domain", "organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationBlockedEmail" ADD CONSTRAINT "OrganizationBlockedEmail_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBlockedEmail" ADD CONSTRAINT "OrganizationBlockedEmail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBlockedEmail" ADD CONSTRAINT "OrganizationBlockedEmail_bookingReportId_fkey" FOREIGN KEY ("bookingReportId") REFERENCES "BookingReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBlockedDomain" ADD CONSTRAINT "OrganizationBlockedDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBlockedDomain" ADD CONSTRAINT "OrganizationBlockedDomain_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBlockedDomain" ADD CONSTRAINT "OrganizationBlockedDomain_bookingReportId_fkey" FOREIGN KEY ("bookingReportId") REFERENCES "BookingReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
