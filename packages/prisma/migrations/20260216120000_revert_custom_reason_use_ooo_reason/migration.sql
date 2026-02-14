-- Drop OutOfOfficeCustomReason and customReasonId from Entry
ALTER TABLE "OutOfOfficeEntry" DROP CONSTRAINT IF EXISTS "OutOfOfficeEntry_customReasonId_fkey";
DROP INDEX IF EXISTS "OutOfOfficeEntry_customReasonId_idx";
ALTER TABLE "OutOfOfficeEntry" DROP COLUMN IF EXISTS "customReasonId";

DROP TABLE IF EXISTS "OutOfOfficeCustomReason";

-- OutOfOfficeReason: drop old unique on reason, add unique on (userId, reason)
DROP INDEX IF EXISTS "OutOfOfficeReason_reason_key";
CREATE UNIQUE INDEX "OutOfOfficeReason_userId_reason_key" ON "OutOfOfficeReason"("userId", "reason");
