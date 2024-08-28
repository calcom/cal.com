-- CreateTable
CREATE TABLE "CredentialExpiryNotification" (
    "id" SERIAL NOT NULL,
    "credentialId" INTEGER,
    "lastNotifiedAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialExpiryNotification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CredentialExpiryNotification" ADD CONSTRAINT "CredentialExpiryNotification_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
