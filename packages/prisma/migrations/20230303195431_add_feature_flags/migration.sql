-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'KILL_SWITCH', 'PERMISSION');

-- CreateTable
CREATE TABLE "Feature" (
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "type" "FeatureType" DEFAULT 'RELEASE',
    "stale" BOOLEAN DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feature_slug_key" ON "Feature"("slug");
