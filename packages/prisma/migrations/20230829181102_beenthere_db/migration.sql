/*
  Warnings:

  - You are about to drop the column `includeCalendarEvent` on the `WorkflowStep` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uid]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `EventType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkflowStep" DROP COLUMN "includeCalendarEvent";

-- CreateTable
CREATE TABLE "Payments" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "refunded" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,
    "externalId" TEXT NOT NULL,
    "paymentOption" "PaymentOption" DEFAULT 'ON_BOOKING',

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payments_uid_key" ON "Payments"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Payments_externalId_key" ON "Payments"("externalId");

-- CreateIndex
CREATE INDEX "Payments_eventId_idx" ON "Payments"("eventId");

-- CreateIndex
CREATE INDEX "Payments_externalId_idx" ON "Payments"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_uid_key" ON "EventType"("uid");

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
