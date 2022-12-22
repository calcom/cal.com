-- AlterEnum
ALTER TYPE "EventTypeCustomInputType" ADD VALUE 'radio';

-- AlterTable
ALTER TABLE "EventTypeCustomInput" ADD COLUMN     "options" JSONB;
