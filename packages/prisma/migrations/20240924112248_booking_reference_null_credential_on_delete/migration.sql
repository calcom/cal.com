-- DropIndex
DROP INDEX "BookingReference_credentialId_idx";

-- Remove disconnected Credentials from bookingReference to prevent foreign key constraint error
UPDATE "BookingReference" br
SET "credentialId" = NULL
WHERE br."credentialId" IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM "Credential" c
        WHERE c."id" = br."credentialId"
    );

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
