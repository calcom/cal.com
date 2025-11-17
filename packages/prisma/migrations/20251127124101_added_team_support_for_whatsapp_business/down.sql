-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowStatus_new" AS ENUM ('DELIVERED', 'READ', 'FAILED');
ALTER TABLE "CalIdWorkflowInsights" ALTER COLUMN "status" TYPE "WorkflowStatus_new" USING ("status"::text::"WorkflowStatus_new");
ALTER TABLE "WorkflowInsights" ALTER COLUMN "status" TYPE "WorkflowStatus_new" USING ("status"::text::"WorkflowStatus_new");
ALTER TYPE "WorkflowStatus" RENAME TO "WorkflowStatus_old";
ALTER TYPE "WorkflowStatus_new" RENAME TO "WorkflowStatus";
DROP TYPE "WorkflowStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "WhatsAppBusinessPhone" DROP CONSTRAINT "WhatsAppBusinessPhone_calIdTeamId_fkey";

-- AlterTable
ALTER TABLE "WhatsAppBusinessPhone" DROP COLUMN "calIdTeamId";

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_credentialId_key" ON "WhatsAppBusinessPhone"("credentialId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_userId_key" ON "WhatsAppBusinessPhone"("userId" ASC);

