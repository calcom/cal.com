/*
  Warnings:

  - You are about to drop the column `details` on the `CreditExpenseLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditExpenseLog" DROP COLUMN "details",
ADD COLUMN     "bookingUid" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "smsSid" TEXT,
ALTER COLUMN "credits" DROP NOT NULL,
ALTER COLUMN "creditType" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
