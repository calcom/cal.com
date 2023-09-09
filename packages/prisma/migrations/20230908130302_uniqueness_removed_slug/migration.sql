-- DropIndex
DROP INDEX "EventType_teamId_slug_key";

-- DropIndex
DROP INDEX "EventType_userId_slug_key";

-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "slug" DROP DEFAULT;
