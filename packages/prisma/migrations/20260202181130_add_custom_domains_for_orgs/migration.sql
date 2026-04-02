-- CreateTable
CREATE TABLE "public"."CustomDomain" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_teamId_key" ON "public"."CustomDomain"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_slug_key" ON "public"."CustomDomain"("slug");

-- CreateIndex
CREATE INDEX "CustomDomain_lastCheckedAt_idx" ON "public"."CustomDomain"("lastCheckedAt" ASC);

-- AddForeignKey
ALTER TABLE "public"."CustomDomain" ADD CONSTRAINT "CustomDomain_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
