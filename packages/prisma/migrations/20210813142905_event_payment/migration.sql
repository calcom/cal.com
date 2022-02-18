-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('STRIPE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT E'usd',
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "refunded" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment.uid_unique" ON "Payment"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Payment.externalId_unique" ON "Payment"("externalId");

-- AddForeignKey
ALTER TABLE "Payment" ADD FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
