-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowActions" ADD VALUE 'WHATSAPP_ATTENDEE';
ALTER TYPE "WorkflowActions" ADD VALUE 'WHATSAPP_NUMBER';

ALTER TYPE "WorkflowMethods" ADD VALUE 'WHATSAPP';

ALTER TYPE "WorkflowTemplates" ADD VALUE 'CANCELLED';
ALTER TYPE "WorkflowTemplates" ADD VALUE 'RESCHEDULED';
ALTER TYPE "WorkflowTemplates" ADD VALUE 'COMPLETED';
