DO $$
DECLARE
    chunk_size INTEGER := 1000;
    sleep_interval FLOAT := 1;
    response_record RECORD;
    processed_count INTEGER := 0;
    total_count INTEGER;
BEGIN
    -- Get total count for progress reporting
    SELECT COUNT(*) INTO total_count FROM "App_RoutingForms_FormResponse";
    RAISE NOTICE 'Starting migration: processing % total responses', total_count;
    
    -- Process responses in chunks, but iterate over actual response IDs
    FOR response_record IN 
        SELECT r.id
        FROM "App_RoutingForms_FormResponse" r
        ORDER BY r.id
    LOOP
        BEGIN
            -- Use the reprocess_routing_form_response_fields function
            PERFORM reprocess_routing_form_response_fields(response_record.id);
            processed_count := processed_count + 1;
            
            -- Sleep after each chunk_size responses
            IF processed_count % chunk_size = 0 THEN
                RAISE NOTICE 'Progress: %/% responses processed, sleeping for % seconds...',
                    processed_count, total_count, sleep_interval;
                PERFORM pg_sleep(sleep_interval);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to process responseId %: %', response_record.id, SQLERRM;
            CONTINUE;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: processed %/% responses', 
        processed_count, total_count;
END $$;