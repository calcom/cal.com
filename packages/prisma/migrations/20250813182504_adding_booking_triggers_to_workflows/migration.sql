-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'BOOKING_REJECTED';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'BOOKING_REQUESTED';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'BOOKING_PAYMENT_INITIATED';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'BOOKING_PAID';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'BOOKING_NO_SHOW_UPDATED';
