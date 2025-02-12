-- CreateTable
CREATE TABLE "PlatformManagedOrganization" (
    "managedOrganizationId" INTEGER NOT NULL,
    "managerOrganizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformManagedOrganization_managedOrganizationId_key" ON "PlatformManagedOrganization"("managedOrganizationId");

-- CreateIndex
CREATE INDEX "PlatformManagedOrganization_managerOrganizationId_idx" ON "PlatformManagedOrganization"("managerOrganizationId");

-- AddForeignKey
ALTER TABLE "PlatformManagedOrganization" ADD CONSTRAINT "PlatformManagedOrganization_managedOrganizationId_fkey" FOREIGN KEY ("managedOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformManagedOrganization" ADD CONSTRAINT "PlatformManagedOrganization_managerOrganizationId_fkey" FOREIGN KEY ("managerOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
