-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('EVENT_TYPE', 'ROUTING_FORM');

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "type" "WorkflowType" NOT NULL DEFAULT 'EVENT_TYPE';
