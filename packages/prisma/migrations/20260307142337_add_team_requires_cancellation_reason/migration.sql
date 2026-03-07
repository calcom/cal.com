-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "requiresCancellationReason" "public"."CancellationReasonRequirement" DEFAULT 'MANDATORY_HOST_ONLY';
