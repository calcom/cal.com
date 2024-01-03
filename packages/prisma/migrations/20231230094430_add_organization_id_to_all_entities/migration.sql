-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "organizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
