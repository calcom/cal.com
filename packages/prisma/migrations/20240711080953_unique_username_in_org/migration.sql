/*
  Warnings:

  - A unique constraint covering the columns `[username,organizationId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_organizationId_key" ON "Profile"("username", "organizationId");
