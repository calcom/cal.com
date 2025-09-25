/*
  Warnings:

  - A unique constraint covering the columns `[name,calIdTeamId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AccessCode" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "calIdTeamId" INTEGER;

-- CreateTable
CREATE TABLE "CalIdTeamFeatures" (
    "calIdTeamId" INTEGER NOT NULL,
    "featureId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalIdTeamFeatures_pkey" PRIMARY KEY ("calIdTeamId","featureId")
);

-- CreateIndex
CREATE INDEX "CalIdTeamFeatures_calIdTeamId_featureId_idx" ON "CalIdTeamFeatures"("calIdTeamId", "featureId");

-- CreateIndex
CREATE INDEX "AccessCode_calIdTeamId_idx" ON "AccessCode"("calIdTeamId");

-- CreateIndex
CREATE INDEX "ApiKey_calIdTeamId_idx" ON "ApiKey"("calIdTeamId");

-- CreateIndex
CREATE INDEX "App_RoutingForms_Form_calIdTeamId_idx" ON "App_RoutingForms_Form"("calIdTeamId");

-- CreateIndex
CREATE INDEX "Attribute_calIdTeamId_idx" ON "Attribute"("calIdTeamId");

-- CreateIndex
CREATE INDEX "Credential_calIdTeamId_idx" ON "Credential"("calIdTeamId");

-- CreateIndex
CREATE INDEX "Role_calIdTeamId_idx" ON "Role"("calIdTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_calIdTeamId_key" ON "Role"("name", "calIdTeamId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdTeamFeatures" ADD CONSTRAINT "CalIdTeamFeatures_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdTeamFeatures" ADD CONSTRAINT "CalIdTeamFeatures_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
