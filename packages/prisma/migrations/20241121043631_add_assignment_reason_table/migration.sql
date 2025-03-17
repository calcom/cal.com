-- CreateEnum
CREATE TYPE "AssignmentReasonEnum" AS ENUM ('ROUTING_FORM_ROUTING', 'ROUTING_FORM_ROUTING_FALLBACK', 'REASSIGNED', 'REROUTED', 'SALESFORCE_ASSIGNMENT');

-- CreateTable
CREATE TABLE "AssignmentReason" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" INTEGER NOT NULL,
    "reasonEnum" "AssignmentReasonEnum" NOT NULL,
    "reasonString" TEXT NOT NULL,

    CONSTRAINT "AssignmentReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentReason_id_key" ON "AssignmentReason"("id");

-- AddForeignKey
ALTER TABLE "AssignmentReason" ADD CONSTRAINT "AssignmentReason_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
