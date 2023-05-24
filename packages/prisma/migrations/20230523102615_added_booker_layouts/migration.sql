-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "bookerLayouts" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultBookerLayouts" JSONB;
