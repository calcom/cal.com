-- CreateEnum
CREATE TYPE "CRUD" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('EventTypeCreate', 'EventTypeUpdate', 'EventTypeDelete', 'BookingCreate', 'BookingUpdate', 'BookingDelete');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "actorUserId" INTEGER;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "actorUserId" INTEGER;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "actorUser" JSONB NOT NULL,
    "target" JSONB NOT NULL,
    "crud" "CRUD" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetTeam" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
