-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "bookingPageAppearance" JSONB;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "bookingPageAppearance" JSONB;

-- CreateIndex
CREATE INDEX "IntegrationAttributeSync_credentialId_idx" ON "public"."IntegrationAttributeSync"("credentialId");
