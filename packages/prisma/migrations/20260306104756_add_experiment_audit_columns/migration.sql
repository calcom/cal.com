-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN "createdById" INTEGER;
ALTER TABLE "Experiment" ADD COLUMN "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "ExperimentVariant" ADD COLUMN "createdById" INTEGER;
ALTER TABLE "ExperimentVariant" ADD COLUMN "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
