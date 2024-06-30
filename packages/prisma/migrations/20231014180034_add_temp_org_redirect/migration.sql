-- CreateEnum
CREATE TYPE "RedirectType" AS ENUM ('user-event-type', 'team-event-type', 'user', 'team');

-- CreateTable
CREATE TABLE "TempOrgRedirect" (
    "id" SERIAL NOT NULL,
    "from" TEXT NOT NULL,
    "fromOrgId" INTEGER NOT NULL,
    "type" "RedirectType" NOT NULL,
    "toUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempOrgRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TempOrgRedirect_from_type_fromOrgId_key" ON "TempOrgRedirect"("from", "type", "fromOrgId");
