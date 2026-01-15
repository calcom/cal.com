-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowStatus_new" AS ENUM ('DELIVERED', 'READ', 'FAILED', 'QUEUED', 'CANCELLED');
ALTER TABLE "CalIdWorkflowInsights" ALTER COLUMN "status" TYPE "WorkflowStatus_new" USING ("status"::text::"WorkflowStatus_new");
ALTER TABLE "WorkflowInsights" ALTER COLUMN "status" TYPE "WorkflowStatus_new" USING ("status"::text::"WorkflowStatus_new");
ALTER TYPE "WorkflowStatus" RENAME TO "WorkflowStatus_old";
ALTER TYPE "WorkflowStatus_new" RENAME TO "WorkflowStatus";
DROP TYPE "WorkflowStatus_old";
COMMIT;

