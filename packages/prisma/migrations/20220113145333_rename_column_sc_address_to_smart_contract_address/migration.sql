-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "scAddress",
ADD COLUMN     "smartContractAddress" TEXT;