/*
  Warnings:

  - You are about to drop the column `type` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "type",
ADD COLUMN     "appId" TEXT;

-- DropEnum
DROP TYPE "PaymentType";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- At this point all payments are from stripe. We update existing values to reflect this.
UPDATE "Payment" SET "appId" = 'stripe';

