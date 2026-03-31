CREATE INDEX IF NOT EXISTS "Task_type_pending_idx" ON "Task"("type") WHERE "succeededAt" IS NULL;
