-- AlterTable
ALTER TABLE "public"."App_RoutingForms_FormResponse" ADD COLUMN     "submitterEmail" TEXT;

-- AlterTable
ALTER TABLE "public"."App_RoutingForms_QueuedFormResponse" ADD COLUMN     "submitterEmail" TEXT;

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_submitterEmail_idx" ON "public"."App_RoutingForms_FormResponse"("submitterEmail");
