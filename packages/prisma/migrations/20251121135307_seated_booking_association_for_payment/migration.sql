-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bookingSeatId" INTEGER;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingSeatId_fkey" FOREIGN KEY ("bookingSeatId") REFERENCES "BookingSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
