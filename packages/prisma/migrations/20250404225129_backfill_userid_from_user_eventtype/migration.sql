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
    updated_count INTEGER := 0;
    batch_error BOOLEAN;
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

        -- Process this batch
        batch_error := FALSE;
        BEGIN
            -- Update EventType table with safe updates only
            WITH to_update AS (
                SELECT DISTINCT ON (et.slug, mb.user_id) 
                    et.id as event_type_id,
                    mb.user_id,
                    et.slug
                FROM "EventType" et
                JOIN migration_batch mb ON et.id = mb.event_type_id
                LEFT JOIN "EventType" et2 ON et2.slug = et.slug 
                    AND et2."userId" = mb.user_id
                    AND et2.id != et.id
                WHERE et2.id IS NULL  -- No existing record with same slug and userId
                AND (et."userId" IS NULL OR et."userId" != mb.user_id)
                ORDER BY et.slug, mb.user_id, et.id  -- Deterministic ordering
            )
            UPDATE "EventType" et
            SET "userId" = tu.user_id
            FROM to_update tu
            WHERE et.id = tu.event_type_id
            AND (et."userId" IS NULL OR et."userId" != tu.user_id);

            GET DIAGNOSTICS updated_count = ROW_COUNT;
            
            -- Count conflicts (records we couldn't update)
            SELECT COUNT(*)
            INTO conflict_count
            FROM migration_batch mb
            WHERE NOT EXISTS (
                SELECT 1
                FROM "EventType" et
                WHERE et.id = mb.event_type_id
                AND et."userId" = mb.user_id
            );

            -- Log progress
            RAISE NOTICE 'Processed batch % of %. Updated % records. Found % conflicts', 
                current_batch + 1, max_batch, updated_count, conflict_count;

        EXCEPTION WHEN OTHERS THEN
            -- If anything goes wrong, mark the batch as failed and continue
            batch_error := TRUE;
            RAISE NOTICE 'Error in batch % of %: %', current_batch + 1, max_batch, SQLERRM;
        END;

        current_batch := current_batch + 1;
    END LOOP;

    -- If any batch failed, raise an exception
    IF batch_error THEN
        RAISE EXCEPTION 'Migration completed with errors in one or more batches';
    END IF;
END $$;

-- Verify the update
DO $$
DECLARE
    mismatch_count INTEGER;
    conflict_count INTEGER;
BEGIN
    -- Check for any mismatches
    SELECT COUNT(*) INTO mismatch_count
    FROM "EventType" et
    JOIN "_user_eventtype" uet ON et.id = uet."A"
    WHERE et."userId" != uet."B";

    -- Count remaining conflicts
    SELECT COUNT(DISTINCT et.id) INTO conflict_count
    FROM "EventType" et
    JOIN "_user_eventtype" uet ON et.id = uet."A"
    WHERE EXISTS (
        SELECT 1
        FROM "EventType" et2
        WHERE et2.slug = et.slug
        AND et2."userId" = uet."B"
        AND et2.id != et.id
    );

    IF mismatch_count > 0 THEN
        RAISE NOTICE 'Found % mismatches and % conflicts after migration', 
            mismatch_count, conflict_count;
        RAISE EXCEPTION 'Migration completed with mismatches';
    END IF;
END $$;

-- Commit if everything is successful
COMMIT;
