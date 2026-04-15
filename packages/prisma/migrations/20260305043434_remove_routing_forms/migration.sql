/*
  Warnings:

  - The values [ROUTING_FORM_ROUTING,ROUTING_FORM_ROUTING_FALLBACK] on the enum `AssignmentReasonEnum` will be removed. If these variants are still used in the database, this will fail.
  - The values [ROUTING_FORM_FALLBACK_HIT] on the enum `WebhookTriggerEvents` will be removed. If these variants are still used in the database, this will fail.
  - The values [ROUTING_FORM] on the enum `WorkflowType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `redirectUrlOnNoRoutingFormResponse` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `routingFormId` on the `WrongAssignmentReport` table. All the data in the column will be lost.
  - You are about to drop the `App_RoutingForms_Form` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `App_RoutingForms_FormResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `App_RoutingForms_IncompleteBookingActions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `App_RoutingForms_QueuedFormResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PendingRoutingTrace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoutingFormResponseDenormalized` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoutingFormResponseField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoutingTrace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkflowsOnRoutingForms` table. If the table is not empty, all the data it contains will be lost.

*/

-- Drop the RoutingFormResponse view (depends on App_RoutingForms_Form and App_RoutingForms_FormResponse)
DROP VIEW IF EXISTS "RoutingFormResponse";

-- Drop triggers on App_RoutingForms_FormResponse
DROP TRIGGER IF EXISTS routing_form_response_insert_update_trigger ON "App_RoutingForms_FormResponse";
DROP TRIGGER IF EXISTS routing_form_response_delete_trigger ON "App_RoutingForms_FormResponse";
DROP TRIGGER IF EXISTS routing_form_response_update_trigger ON "App_RoutingForms_FormResponse";

-- Drop triggers on App_RoutingForms_Form
DROP TRIGGER IF EXISTS routing_form_name_update_trigger ON "App_RoutingForms_Form";
DROP TRIGGER IF EXISTS routing_form_team_update_trigger ON "App_RoutingForms_Form";
DROP TRIGGER IF EXISTS routing_form_user_update_trigger ON "App_RoutingForms_Form";
DROP TRIGGER IF EXISTS routing_form_delete_trigger ON "App_RoutingForms_Form";

-- Drop triggers on RoutingFormResponseDenormalized
DROP TRIGGER IF EXISTS routing_form_response_denormalized_insert_trigger ON "RoutingFormResponseDenormalized";

-- Drop routing-form-related triggers on Booking
DROP TRIGGER IF EXISTS booking_insert_trigger_for_routing_form ON "Booking";
DROP TRIGGER IF EXISTS booking_update_trigger_for_routing_form ON "Booking";
DROP TRIGGER IF EXISTS booking_delete_trigger_for_routing_form ON "Booking";

-- Drop routing-form-related triggers on users
DROP TRIGGER IF EXISTS user_update_trigger_for_routing_form ON users;
DROP TRIGGER IF EXISTS user_delete_trigger_for_routing_form ON users;

-- Drop routing-form-related triggers on EventType
DROP TRIGGER IF EXISTS event_type_update_trigger_for_routing_form ON "EventType";
DROP TRIGGER IF EXISTS trigger_nullify_routing_form_response_denormalized_event_type ON "EventType";

-- Drop routing-form-related triggers on AssignmentReason
DROP TRIGGER IF EXISTS assignment_reason_insert_trigger_for_routing_form ON "AssignmentReason";
DROP TRIGGER IF EXISTS assignment_reason_update_trigger_for_routing_form ON "AssignmentReason";
DROP TRIGGER IF EXISTS assignment_reason_delete_trigger_for_routing_form ON "AssignmentReason";

-- Drop routing-form-related triggers on Tracking
DROP TRIGGER IF EXISTS tracking_insert_trigger_for_routing_form ON "Tracking";
DROP TRIGGER IF EXISTS tracking_update_trigger_for_routing_form ON "Tracking";
DROP TRIGGER IF EXISTS tracking_delete_trigger_for_routing_form ON "Tracking";

-- Drop routing-form-related functions
DROP FUNCTION IF EXISTS handle_routing_form_response_fields();
DROP FUNCTION IF EXISTS _process_routing_form_response_fields(integer, jsonb, text);
DROP FUNCTION IF EXISTS reprocess_routing_form_response_fields(integer);
DROP FUNCTION IF EXISTS refresh_routing_form_response_denormalized(integer);
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized();
DROP FUNCTION IF EXISTS trigger_delete_routing_form_response_denormalized();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_form_name();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_form_team();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_form_user();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_booking();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_user();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_event_type();
DROP FUNCTION IF EXISTS trigger_cleanup_routing_form_response_denormalized_form();
DROP FUNCTION IF EXISTS trigger_cleanup_routing_form_response_denormalized_user();
DROP FUNCTION IF EXISTS trigger_cleanup_routing_form_response_denormalized_booking();
DROP FUNCTION IF EXISTS trigger_nullify_routing_form_response_denormalized_event_type();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_assignment_reason();
DROP FUNCTION IF EXISTS trigger_cleanup_routing_form_response_denormalized_assignment_reason();
DROP FUNCTION IF EXISTS trigger_refresh_routing_form_response_denormalized_tracking();
DROP FUNCTION IF EXISTS trigger_cleanup_routing_form_response_denormalized_tracking();
DROP FUNCTION IF EXISTS calculate_booking_status_order(text);

-- Pre-migration cleanup to allow enum variant removal
DELETE FROM "public"."AssignmentReason" WHERE "reasonEnum" IN ('ROUTING_FORM_ROUTING', 'ROUTING_FORM_ROUTING_FALLBACK');

UPDATE "public"."Webhook"
SET "eventTriggers" = array_remove("eventTriggers", 'ROUTING_FORM_FALLBACK_HIT'::"public"."WebhookTriggerEvents")
WHERE "eventTriggers" @> ARRAY['ROUTING_FORM_FALLBACK_HIT']::"public"."WebhookTriggerEvents"[];

DELETE FROM "public"."Workflow" WHERE "type" = 'ROUTING_FORM';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AssignmentReasonEnum_new" AS ENUM ('REASSIGNED', 'RR_REASSIGNED', 'REROUTED', 'SALESFORCE_ASSIGNMENT');
ALTER TABLE "public"."AssignmentReason" ALTER COLUMN "reasonEnum" TYPE "public"."AssignmentReasonEnum_new" USING ("reasonEnum"::text::"public"."AssignmentReasonEnum_new");
ALTER TYPE "public"."AssignmentReasonEnum" RENAME TO "AssignmentReasonEnum_old";
ALTER TYPE "public"."AssignmentReasonEnum_new" RENAME TO "AssignmentReasonEnum";
DROP TYPE "public"."AssignmentReasonEnum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."WebhookTriggerEvents_new" AS ENUM ('BOOKING_CREATED', 'BOOKING_PAYMENT_INITIATED', 'BOOKING_PAID', 'BOOKING_RESCHEDULED', 'BOOKING_REQUESTED', 'BOOKING_CANCELLED', 'BOOKING_REJECTED', 'BOOKING_NO_SHOW_UPDATED', 'FORM_SUBMITTED', 'MEETING_ENDED', 'MEETING_STARTED', 'RECORDING_READY', 'INSTANT_MEETING', 'RECORDING_TRANSCRIPTION_GENERATED', 'OOO_CREATED', 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW', 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW', 'FORM_SUBMITTED_NO_EVENT', 'DELEGATION_CREDENTIAL_ERROR', 'WRONG_ASSIGNMENT_REPORT');
ALTER TABLE "public"."Webhook" ALTER COLUMN "eventTriggers" TYPE "public"."WebhookTriggerEvents_new"[] USING ("eventTriggers"::text::"public"."WebhookTriggerEvents_new"[]);
ALTER TYPE "public"."WebhookTriggerEvents" RENAME TO "WebhookTriggerEvents_old";
ALTER TYPE "public"."WebhookTriggerEvents_new" RENAME TO "WebhookTriggerEvents";
DROP TYPE "public"."WebhookTriggerEvents_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."WorkflowType_new" AS ENUM ('EVENT_TYPE');
ALTER TABLE "public"."Workflow" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."Workflow" ALTER COLUMN "type" TYPE "public"."WorkflowType_new" USING ("type"::text::"public"."WorkflowType_new");
ALTER TYPE "public"."WorkflowType" RENAME TO "WorkflowType_old";
ALTER TYPE "public"."WorkflowType_new" RENAME TO "WorkflowType";
DROP TYPE "public"."WorkflowType_old";
ALTER TABLE "public"."Workflow" ALTER COLUMN "type" SET DEFAULT 'EVENT_TYPE';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_FormResponse" DROP CONSTRAINT "App_RoutingForms_FormResponse_formId_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_FormResponse" DROP CONSTRAINT "App_RoutingForms_FormResponse_routedToBookingUid_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_IncompleteBookingActions" DROP CONSTRAINT "App_RoutingForms_IncompleteBookingActions_formId_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_QueuedFormResponse" DROP CONSTRAINT "App_RoutingForms_QueuedFormResponse_actualResponseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."App_RoutingForms_QueuedFormResponse" DROP CONSTRAINT "App_RoutingForms_QueuedFormResponse_formId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PendingRoutingTrace" DROP CONSTRAINT "PendingRoutingTrace_formResponseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PendingRoutingTrace" DROP CONSTRAINT "PendingRoutingTrace_queuedFormResponseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingFormResponseField" DROP CONSTRAINT "RoutingFormResponseField_responseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingFormResponseField" DROP CONSTRAINT "RoutingFormResponseField_response_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingTrace" DROP CONSTRAINT "RoutingTrace_assignmentReasonId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingTrace" DROP CONSTRAINT "RoutingTrace_bookingUid_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingTrace" DROP CONSTRAINT "RoutingTrace_formResponseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoutingTrace" DROP CONSTRAINT "RoutingTrace_queuedFormResponseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WorkflowsOnRoutingForms" DROP CONSTRAINT "WorkflowsOnRoutingForms_routingFormId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WorkflowsOnRoutingForms" DROP CONSTRAINT "WorkflowsOnRoutingForms_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WrongAssignmentReport" DROP CONSTRAINT "WrongAssignmentReport_routingFormId_fkey";

-- DropIndex
DROP INDEX "public"."WrongAssignmentReport_routingFormId_idx";

-- AlterTable
ALTER TABLE "public"."EventType" DROP COLUMN "redirectUrlOnNoRoutingFormResponse";

-- AlterTable
ALTER TABLE "public"."WrongAssignmentReport" DROP COLUMN "routingFormId";

-- DropTable
DROP TABLE "public"."App_RoutingForms_Form";

-- DropTable
DROP TABLE "public"."App_RoutingForms_FormResponse";

-- DropTable
DROP TABLE "public"."App_RoutingForms_IncompleteBookingActions";

-- DropTable
DROP TABLE "public"."App_RoutingForms_QueuedFormResponse";

-- DropTable
DROP TABLE "public"."PendingRoutingTrace";

-- DropTable
DROP TABLE "public"."RoutingFormResponseDenormalized";

-- DropTable
DROP TABLE "public"."RoutingFormResponseField";

-- DropTable
DROP TABLE "public"."RoutingTrace";

-- DropTable
DROP TABLE "public"."WorkflowsOnRoutingForms";

-- DropEnum
DROP TYPE "public"."IncompleteBookingActionType";
