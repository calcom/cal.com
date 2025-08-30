-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "secondaryEmailId" INTEGER;

-- CreateIndex
CREATE INDEX "VerificationToken_secondaryEmailId_idx" ON "VerificationToken"("secondaryEmailId");

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "SecondaryEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
