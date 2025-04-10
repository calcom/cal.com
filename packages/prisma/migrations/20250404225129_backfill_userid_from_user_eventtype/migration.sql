-- Start transaction
BEGIN;

-- Create temporary table for batch processing
CREATE TEMP TABLE migration_batch (
    id SERIAL PRIMARY KEY,
    event_type_id INTEGER,
    user_id INTEGER
);

-- Insert records in batches
DO $$
DECLARE
    batch_size INTEGER := 1000;
    total_records INTEGER;
    current_batch INTEGER := 0;
    max_batch INTEGER;
    conflict_count INTEGER := 0;
BEGIN
    -- Get total records
    SELECT COUNT(*) INTO total_records FROM "_user_eventtype";
    max_batch := CEIL(total_records::float / batch_size);

    -- Process in batches
    WHILE current_batch < max_batch LOOP
        -- Clear temporary table
        TRUNCATE TABLE migration_batch;

        -- Insert next batch
        INSERT INTO migration_batch (event_type_id, user_id)
        SELECT "A", "B"
        FROM "_user_eventtype"
        ORDER BY "A"
        LIMIT batch_size
        OFFSET (current_batch * batch_size);

        -- Update EventType table only for records that won't cause unique constraint violations
        WITH potential_conflicts AS (
            SELECT et.id, et.slug, mb.user_id
            FROM "EventType" et
            JOIN migration_batch mb ON et.id = mb.event_type_id
            WHERE EXISTS (
                SELECT 1 
                FROM "EventType" et2 
                WHERE et2."userId" = mb.user_id 
                AND et2.slug = et.slug
                AND et2.id != et.id
            )
        ),
        conflict_count AS (
            SELECT COUNT(*) as count FROM potential_conflicts
        )
        UPDATE "EventType" et
        SET "userId" = mb.user_id
        FROM migration_batch mb
        WHERE et.id = mb.event_type_id
        AND (et."userId" IS NULL OR et."userId" != mb.user_id)
        AND NOT EXISTS (
            SELECT 1 
            FROM potential_conflicts pc 
            WHERE pc.id = et.id
        )
        RETURNING (SELECT count FROM conflict_count) INTO conflict_count;

        -- Log progress and conflicts
        RAISE NOTICE 'Processed batch % of %. Found % potential conflicts', 
            current_batch + 1, max_batch, conflict_count;

        current_batch := current_batch + 1;
    END LOOP;
END $$;

-- Verify the update
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    -- Check for any mismatches
    SELECT COUNT(*) INTO mismatch_count
    FROM "EventType" et
    JOIN "_user_eventtype" uet ON et.id = uet."A"
    WHERE et."userId" != uet."B";

    IF mismatch_count > 0 THEN
        RAISE EXCEPTION 'Found % mismatches after migration', mismatch_count;
    END IF;
END $$;

-- Commit if everything is successful
COMMIT;
