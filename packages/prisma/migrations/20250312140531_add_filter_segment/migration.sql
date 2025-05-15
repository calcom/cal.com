-- CreateEnum
CREATE TYPE "FilterSegmentScope" AS ENUM ('USER', 'TEAM');

-- CreateTable
CREATE TABLE "FilterSegment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tableIdentifier" TEXT NOT NULL,
    "scope" "FilterSegmentScope" NOT NULL,
    "activeFilters" JSONB,
    "sorting" JSONB,
    "columnVisibility" JSONB,
    "columnSizing" JSONB,
    "perPage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,

    CONSTRAINT "FilterSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilterSegment_scope_userId_tableIdentifier_idx" ON "FilterSegment"("scope", "userId", "tableIdentifier");

-- CreateIndex
CREATE INDEX "FilterSegment_scope_teamId_tableIdentifier_idx" ON "FilterSegment"("scope", "teamId", "tableIdentifier");

-- AddForeignKey
ALTER TABLE "FilterSegment" ADD CONSTRAINT "FilterSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSegment" ADD CONSTRAINT "FilterSegment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
