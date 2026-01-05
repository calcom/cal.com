-- CreateEnum
CREATE TYPE "public"."ExperimentAssignmentType" AS ENUM ('DETERMINISTIC', 'RANDOM');

-- AlterTable
ALTER TABLE "public"."Feature" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "public"."ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentSlug" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "assignmentType" "public"."ExperimentAssignmentType" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentSlug_idx" ON "public"."ExperimentVariant"("experimentSlug");

-- CreateIndex
CREATE INDEX "ExperimentVariant_userId_idx" ON "public"."ExperimentVariant"("userId");

-- CreateIndex
CREATE INDEX "ExperimentVariant_teamId_idx" ON "public"."ExperimentVariant"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentSlug_userId_key" ON "public"."ExperimentVariant"("experimentSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentSlug_teamId_key" ON "public"."ExperimentVariant"("experimentSlug", "teamId");

-- AddForeignKey
ALTER TABLE "public"."ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentSlug_fkey" FOREIGN KEY ("experimentSlug") REFERENCES "public"."Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
