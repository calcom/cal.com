-- CreateTable
CREATE TABLE "ManagedOrganization" (
    "managedOrganizationId" INTEGER NOT NULL,
    "managerOrganizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedOrganization_managedOrganizationId_key" ON "ManagedOrganization"("managedOrganizationId");

-- CreateIndex
CREATE INDEX "ManagedOrganization_managerOrganizationId_idx" ON "ManagedOrganization"("managerOrganizationId");

-- AddForeignKey
ALTER TABLE "ManagedOrganization" ADD CONSTRAINT "ManagedOrganization_managedOrganizationId_fkey" FOREIGN KEY ("managedOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedOrganization" ADD CONSTRAINT "ManagedOrganization_managerOrganizationId_fkey" FOREIGN KEY ("managerOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
