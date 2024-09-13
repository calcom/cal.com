-- CreateEnum
CREATE TYPE "WorkspacePlatform" AS ENUM ('google', 'microsoft');

-- CreateTable
CREATE TABLE "DomainWideDelegation" (
    "id" TEXT NOT NULL,
    "workspacePlatform" "WorkspacePlatform" NOT NULL,
    "serviceAccountKey" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DomainWideDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainWideDelegation_organizationId_workspacePlatform_key" ON "DomainWideDelegation"("organizationId", "workspacePlatform");

-- AddForeignKey
ALTER TABLE "DomainWideDelegation" ADD CONSTRAINT "DomainWideDelegation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
