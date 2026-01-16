-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowTemplates_new" AS ENUM ('REMINDER', 'CUSTOM', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'RATING', 'THANKYOU');
ALTER TABLE "WorkflowStep" ALTER COLUMN "template" DROP DEFAULT;
ALTER TABLE "CalIdWorkflowStep" ALTER COLUMN "template" DROP DEFAULT;
ALTER TABLE "CalIdWorkflowStep" ALTER COLUMN "template" TYPE "WorkflowTemplates_new" USING ("template"::text::"WorkflowTemplates_new");
ALTER TABLE "WorkflowStep" ALTER COLUMN "template" TYPE "WorkflowTemplates_new" USING ("template"::text::"WorkflowTemplates_new");
ALTER TYPE "WorkflowTemplates" RENAME TO "WorkflowTemplates_old";
ALTER TYPE "WorkflowTemplates_new" RENAME TO "WorkflowTemplates";
DROP TYPE "WorkflowTemplates_old";
ALTER TABLE "WorkflowStep" ALTER COLUMN "template" SET DEFAULT 'REMINDER';
ALTER TABLE "CalIdWorkflowStep" ALTER COLUMN "template" SET DEFAULT 'REMINDER';
COMMIT;

