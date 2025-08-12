/*
  Warnings:

  - A unique constraint covering the columns `[managerOrganizationId,managedOrganizationId]` on the table `ManagedOrganization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ManagedOrganization_managerOrganizationId_managedOrganizati_key" ON "ManagedOrganization"("managerOrganizationId", "managedOrganizationId");
