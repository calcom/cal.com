-- CreateEnum
CREATE TYPE "public"."AssignmentType" AS ENUM ('DETERMINISTIC', 'RANDOM');

-- CreateTable
CREATE TABLE "public"."ExperimentVariant" (
    "id" UUID NOT NULL,
    "experimentSlug" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "visitorId" TEXT,
    "assignmentType" "public"."AssignmentType" NOT NULL,
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
CREATE INDEX "ExperimentVariant_visitorId_idx" ON "public"."ExperimentVariant"("visitorId");

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentSlug_userId_idx" ON "public"."ExperimentVariant"("experimentSlug", "userId");

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentSlug_teamId_idx" ON "public"."ExperimentVariant"("experimentSlug", "teamId");

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentSlug_visitorId_idx" ON "public"."ExperimentVariant"("experimentSlug", "visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentSlug_userId_key" ON "public"."ExperimentVariant"("experimentSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentSlug_teamId_key" ON "public"."ExperimentVariant"("experimentSlug", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentSlug_visitorId_key" ON "public"."ExperimentVariant"("experimentSlug", "visitorId");

-- AddForeignKey
ALTER TABLE "public"."ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
