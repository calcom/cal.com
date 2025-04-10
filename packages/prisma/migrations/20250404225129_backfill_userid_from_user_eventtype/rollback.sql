-- Start transaction
BEGIN;

-- Restore EventType table from backup
UPDATE "EventType" et
SET "userId" = etb."userId"
FROM "EventType_backup_20250404" etb
WHERE et.id = etb.id;

-- Verify the rollback
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    -- Check for any mismatches with backup
    SELECT COUNT(*) INTO mismatch_count
    FROM "EventType" et
    JOIN "EventType_backup_20250404" etb ON et.id = etb.id
    WHERE et."userId" != etb."userId";

    IF mismatch_count > 0 THEN
        RAISE EXCEPTION 'Found % mismatches after rollback', mismatch_count;
    END IF;
END $$;

-- Commit if everything is successful
COMMIT; 
