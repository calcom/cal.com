-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Update existing records to set verifiedAt to the current date
UPDATE "WorkflowStep" SET "verifiedAt" = NOW();