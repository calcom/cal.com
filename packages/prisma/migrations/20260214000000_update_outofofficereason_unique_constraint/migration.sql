-- Drop the existing unique index on reason column
DROP INDEX IF EXISTS "OutOfOfficeReason_reason_key";

-- Create composite unique index on (reason, userId)
-- NULL values are considered distinct in PostgreSQL, so system defaults (userId=null) 
-- can have duplicate reasons without conflict
CREATE UNIQUE INDEX "OutOfOfficeReason_reason_userId_key" ON "OutOfOfficeReason"("reason", "userId");
