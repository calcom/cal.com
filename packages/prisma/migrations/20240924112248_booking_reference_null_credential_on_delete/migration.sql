-- DropIndex
DROP INDEX "BookingReference_credentialId_idx";

-- Remove disconnected Credentials from bookingReference to prevent foreign key constraint error
UPDATE "BookingReference"
SET "credentialId" = NULL
WHERE "credentialId" IS NOT NULL
AND "credentialId" NOT IN (SELECT "id" FROM "Credential");

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
