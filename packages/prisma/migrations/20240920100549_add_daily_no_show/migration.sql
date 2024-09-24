-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW';
