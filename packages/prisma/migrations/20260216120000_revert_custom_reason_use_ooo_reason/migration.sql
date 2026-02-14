-- OutOfOfficeReason: drop old unique on reason, add unique on (userId, reason)
DROP INDEX IF EXISTS "OutOfOfficeReason_reason_key";
CREATE UNIQUE INDEX "OutOfOfficeReason_userId_reason_key" ON "OutOfOfficeReason"("userId", "reason");
