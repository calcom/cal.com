-- AlterTable
ALTER TABLE "public"."App_RoutingForms_FormResponse" ADD COLUMN     "routingTrace" JSONB;

-- AlterTable
ALTER TABLE "public"."App_RoutingForms_QueuedFormResponse" ADD COLUMN     "routingTrace" JSONB;
