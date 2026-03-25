-- DropForeignKey
ALTER TABLE "public"."EventType" DROP CONSTRAINT "EventType_secondaryEmailId_fkey";

-- AddForeignKey
ALTER TABLE "public"."EventType" ADD CONSTRAINT "EventType_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "public"."SecondaryEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
