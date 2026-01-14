-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingSeatId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "bookingSeatId";

