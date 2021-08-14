
-- CreateEnum
CREATE TYPE "EventTypeCustomInputType" AS ENUM ('text', 'textLong', 'number', 'bool');

--- AlterTable
ALTER TABLE "EventTypeCustomInput" RENAME COLUMN "type" TO "type_old";
ALTER TABLE "EventTypeCustomInput" ADD COLUMN "type" "EventTypeCustomInputType";

-- UpdateTable
UPDATE "EventTypeCustomInput" SET "type" = CAST( "type_old" AS "EventTypeCustomInputType" );

-- AlterTable
ALTER TABLE "EventTypeCustomInput" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "EventTypeCustomInput" DROP COLUMN "type_old";
