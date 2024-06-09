
-- AlterTable
ALTER TABLE "WebhookScheduledTriggers" ADD COLUMN     "legacyPayload" TEXT;

-- Update the legacyPayload column with the payload column's value
UPDATE "WebhookScheduledTriggers" SET "legacyPayload" = "payload";

-- make payload column values to {}
UPDATE "WebhookScheduledTriggers" SET "payload" = '';


-- Make the legacyPayload column not nullable
ALTER TABLE "WebhookScheduledTriggers" ALTER COLUMN "legacyPayload" SET NOT NULL;

