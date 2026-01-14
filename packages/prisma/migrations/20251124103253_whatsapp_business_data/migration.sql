-- AlterTable
ALTER TABLE "CalIdWorkflowStep" ADD COLUMN     "metaTemplateName" TEXT,
ADD COLUMN     "metaTemplatePhoneNumberId" TEXT,
ADD COLUMN     "variableMapping" JSONB,
ALTER COLUMN "template" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WhatsAppBusinessPhone" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "templates" JSONB,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBusinessPhone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_userId_key" ON "WhatsAppBusinessPhone"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_credentialId_key" ON "WhatsAppBusinessPhone"("credentialId");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessPhone_userId_idx" ON "WhatsAppBusinessPhone"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessPhone_phoneNumber_idx" ON "WhatsAppBusinessPhone"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessPhone_phoneNumberId_idx" ON "WhatsAppBusinessPhone"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessPhone_wabaId_idx" ON "WhatsAppBusinessPhone"("wabaId");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessPhone_credentialId_idx" ON "WhatsAppBusinessPhone"("credentialId");

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessPhone" ADD CONSTRAINT "WhatsAppBusinessPhone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessPhone" ADD CONSTRAINT "WhatsAppBusinessPhone_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
