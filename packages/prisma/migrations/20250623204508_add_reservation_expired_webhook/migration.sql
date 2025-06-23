-- AlterEnum
ALTER TYPE "WebhookTriggerEvents" ADD VALUE 'RESERVATION_EXPIRED';

-- AlterTable
ALTER TABLE "WebhookScheduledTriggers" ADD COLUMN     "selectedSlotId" INTEGER;

-- AddForeignKey
ALTER TABLE "WebhookScheduledTriggers" ADD CONSTRAINT "WebhookScheduledTriggers_selectedSlotId_fkey" FOREIGN KEY ("selectedSlotId") REFERENCES "SelectedSlots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
