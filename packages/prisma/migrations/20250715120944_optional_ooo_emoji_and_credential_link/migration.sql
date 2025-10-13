-- AlterTable
ALTER TABLE "OutOfOfficeReason" ADD COLUMN     "credentialId" INTEGER,
ALTER COLUMN "emoji" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OutOfOfficeReason" ADD CONSTRAINT "OutOfOfficeReason_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
