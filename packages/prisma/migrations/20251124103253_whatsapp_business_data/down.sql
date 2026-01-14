-- DropForeignKey
ALTER TABLE "WhatsAppBusinessPhone" DROP CONSTRAINT "WhatsAppBusinessPhone_userId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppBusinessPhone" DROP CONSTRAINT "WhatsAppBusinessPhone_credentialId_fkey";

-- AlterTable
ALTER TABLE "CalIdWorkflowStep" DROP COLUMN "metaTemplateName",
DROP COLUMN "metaTemplatePhoneNumberId",
DROP COLUMN "variableMapping",
ALTER COLUMN "template" SET NOT NULL;

-- DropTable
DROP TABLE "WhatsAppBusinessPhone";

