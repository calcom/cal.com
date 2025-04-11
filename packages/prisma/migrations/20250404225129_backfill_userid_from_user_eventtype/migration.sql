-- Start transaction
BEGIN;

-- Create temporary table for batch processing
CREATE TEMP TABLE migration_batch (
    id SERIAL PRIMARY KEY,
    event_type_id INTEGER,
    user_id INTEGER,
    processed BOOLEAN DEFAULT FALSE
);

-- Create a table to track processed records if it doesn't exist
CREATE TABLE IF NOT EXISTS "_migration_progress" (
    event_type_id INTEGER PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    target_user_id INTEGER,
    status TEXT DEFAULT 'processed'  -- 'processed', 'skipped_conflict', 'skipped_mismatch'
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
    skipped_count INTEGER := 0;
    batch_error BOOLEAN;
BEGIN
    -- Get total records that haven't been processed yet
    SELECT COUNT(*) INTO total_records 
    FROM "_user_eventtype" uet
    LEFT JOIN "_migration_progress" mp ON uet."A" = mp.event_type_id
    WHERE mp.event_type_id IS NULL;
    
    max_batch := CEIL(total_records::float / batch_size);

    -- Process in batches
    WHILE current_batch < max_batch LOOP
        -- Clear temporary table
        TRUNCATE TABLE migration_batch;

        -- Insert next batch of unprocessed records, using the first user association for each event type
        INSERT INTO migration_batch (event_type_id, user_id)
        SELECT DISTINCT ON (uet."A") uet."A", uet."B"
        FROM "_user_eventtype" uet
        LEFT JOIN "_migration_progress" mp ON uet."A" = mp.event_type_id
        WHERE mp.event_type_id IS NULL
        ORDER BY uet."A", uet."B"  -- Consistent ordering
        LIMIT batch_size
        OFFSET (current_batch * batch_size);

        -- Process this batch
        batch_error := FALSE;
        BEGIN
            -- Create temporary table for updated records
            CREATE TEMP TABLE updated_records (
                event_type_id INTEGER,
                user_id INTEGER,
                new_slug TEXT
            );

            -- Update EventType table with safe updates only
            WITH to_update AS (
                SELECT DISTINCT ON (et.id)  -- Ensure we only update each event type once
                    et.id as event_type_id,
                    mb.user_id,
                    et.slug,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM "EventType" et2 
                            WHERE et2.slug = et.slug 
                            AND et2."userId" = mb.user_id
                            AND et2.id != et.id
                        ) THEN 'conflict'
                        ELSE 'safe'
                    END as update_status
                FROM "EventType" et
                JOIN migration_batch mb ON et.id = mb.event_type_id
                ORDER BY et.id, mb.user_id  -- Consistent ordering
            ),
            new_slugs AS (
                SELECT 
                    event_type_id,
                    user_id,
                    CASE 
                        WHEN update_status = 'conflict' THEN 
                            slug || '-dup-' || event_type_id  -- Use event_type_id instead of timestamp for uniqueness
                        ELSE NULL
                    END as new_slug
                FROM to_update
            )
            INSERT INTO updated_records (event_type_id, user_id, new_slug)
            SELECT event_type_id, user_id, new_slug
            FROM new_slugs;

            -- First update the slugs for conflicting records
            UPDATE "EventType" et
            SET slug = ur.new_slug
            FROM updated_records ur
            WHERE et.id = ur.event_type_id
            AND ur.new_slug IS NOT NULL;

            -- Then update the user IDs
            UPDATE "EventType" et
            SET "userId" = ur.user_id
            FROM updated_records ur
            WHERE et.id = ur.event_type_id;

            GET DIAGNOSTICS updated_count = ROW_COUNT;
            
            -- Mark processed records
            WITH processed_records AS (
                SELECT 
                    mb.event_type_id,
                    mb.user_id,
                    CASE 
                        WHEN ur.event_type_id IS NOT NULL THEN 'processed'
                        ELSE 'skipped_mismatch'
                    END as status
                FROM migration_batch mb
                JOIN "EventType" et ON et.id = mb.event_type_id
                LEFT JOIN updated_records ur ON mb.event_type_id = ur.event_type_id
            )
            INSERT INTO "_migration_progress" (event_type_id, target_user_id, status)
            SELECT event_type_id, user_id, status
            FROM processed_records
            ON CONFLICT (event_type_id) DO NOTHING;

            -- Count skipped records
            SELECT COUNT(*) INTO skipped_count
            FROM "_migration_progress"
            WHERE status IN ('skipped_conflict', 'skipped_mismatch')
            AND processed_at > CURRENT_TIMESTAMP - INTERVAL '1 minute';

            -- Drop temporary table
            DROP TABLE updated_records;
            
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
            RAISE NOTICE 'Processed batch % of %. Updated % records. Skipped % records. Found % conflicts', 
                current_batch + 1, max_batch, updated_count, skipped_count, conflict_count;

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
    mismatch_details TEXT;
    conflict_details TEXT;
    skipped_details TEXT;
BEGIN
    -- Show sample of mismatches
    RAISE NOTICE 'Sample of mismatches (EventType.userId != _user_eventtype.B):';
    
    -- Get mismatch details
    WITH mismatches AS (
        SELECT 
            et.id,
            et.slug,
            et."userId" as current_user_id,
            uet."B" as expected_user_id,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM "EventType" et2 
                    WHERE et2.slug = et.slug 
                    AND et2."userId" = uet."B"
                    AND et2.id != et.id
                ) THEN 'Yes'
                ELSE 'No'
            END as has_conflict
        FROM "EventType" et
        JOIN "_user_eventtype" uet ON et.id = uet."A"
        JOIN "_migration_progress" mp ON et.id = mp.event_type_id
        WHERE et."userId" != uet."B"
        AND mp.status = 'processed'  -- Only check records we've processed
        LIMIT 5
    )
    SELECT string_agg(
        format(
            E'\nID: %s, Slug: %s, Current UserID: %s, Expected UserID: %s, Has Conflict: %s',
            id, slug, current_user_id, expected_user_id, has_conflict
        ),
        ''
    )
    FROM mismatches
    INTO mismatch_details;
    
    -- Display mismatch details
    RAISE NOTICE '%', mismatch_details;

    -- Count total mismatches only for processed records
    SELECT COUNT(*) INTO mismatch_count
    FROM "EventType" et
    JOIN "_user_eventtype" uet ON et.id = uet."A"
    JOIN "_migration_progress" mp ON et.id = mp.event_type_id
    WHERE et."userId" != uet."B"
    AND mp.status = 'processed';  -- Only count mismatches in processed records

    -- Show sample of conflicts
    RAISE NOTICE 'Sample of conflicts (duplicate slug for same userId):';
    WITH conflicts AS (
        SELECT 
            et.id,
            et.slug,
            uet."B" as target_user_id,
            et2.id as existing_event_id,
            et2."userId" as existing_user_id
        FROM "EventType" et
        JOIN "_user_eventtype" uet ON et.id = uet."A"
        JOIN "EventType" et2 ON et2.slug = et.slug 
            AND et2."userId" = uet."B"
            AND et2.id != et.id
        JOIN "_migration_progress" mp ON et.id = mp.event_type_id
        WHERE mp.status = 'skipped_conflict'  -- Only show skipped conflicts
        LIMIT 5
    )
    SELECT string_agg(
        format(
            E'\nEventType ID: %s, Slug: %s, Target UserID: %s conflicts with existing EventType ID: %s (UserID: %s)',
            id, slug, target_user_id, existing_event_id, existing_user_id
        ),
        ''
    )
    FROM conflicts
    INTO conflict_details;
    
    -- Display conflict details
    RAISE NOTICE '%', conflict_details;

    -- Count total conflicts only for processed records
    SELECT COUNT(DISTINCT et.id) INTO conflict_count
    FROM "EventType" et
    JOIN "_user_eventtype" uet ON et.id = uet."A"
    JOIN "_migration_progress" mp ON et.id = mp.event_type_id
    WHERE mp.status = 'skipped_conflict';  -- Only count skipped conflicts

    -- Show summary of skipped records
    WITH skipped_summary AS (
        SELECT status, COUNT(*) as count
        FROM "_migration_progress"
        WHERE status IN ('skipped_conflict', 'skipped_mismatch')
        GROUP BY status
    )
    SELECT string_agg(
        format(E'\n%s: %s records', status, count),
        ''
    )
    FROM skipped_summary
    INTO skipped_details;
    
    RAISE NOTICE 'Summary of skipped records:%', skipped_details;
    RAISE NOTICE 'Found % total mismatches in processed records and % total conflicts', mismatch_count, conflict_count;

    -- Only fail if we have conflicts in processed records
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Migration completed with conflicts in processed records';
    END IF;
END $$;

-- Commit if everything is successful
COMMIT;
