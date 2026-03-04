-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'STOPPED', 'ROLLED_OUT');

-- CreateTable
CREATE TABLE "Experiment" (
    "slug" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "winner" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "ExperimentVariant" (
    "experimentSlug" TEXT NOT NULL,
    "variantSlug" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("experimentSlug","variantSlug")
);

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- AddForeignKey
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentSlug_fkey" FOREIGN KEY ("experimentSlug") REFERENCES "Experiment"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
