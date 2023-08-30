-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "joined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ques" TEXT,
ALTER COLUMN "disableGuests" SET DEFAULT true;
