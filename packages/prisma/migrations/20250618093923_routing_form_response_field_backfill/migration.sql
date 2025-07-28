DO $$
DECLARE
    chunk_size INTEGER := 1000;
    sleep_interval FLOAT := 1;
    start_id INTEGER := 1;
    end_id INTEGER;
    current_id INTEGER;
    response_record RECORD;
    processed_count INTEGER := 0;
    chunk_updated_count INTEGER := 0;
    total_count INTEGER;
BEGIN
    -- Get the maximum ID and total count from the App_RoutingForms_FormResponse table
    SELECT COALESCE(MAX(id), 0) INTO end_id FROM "App_RoutingForms_FormResponse";
    SELECT COUNT(*) INTO total_count FROM "App_RoutingForms_FormResponse";
    
    -- Handle case where there are no records to process
    IF total_count = 0 THEN
        RAISE NOTICE 'No records found in App_RoutingForms_FormResponse table. Migration completed.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Starting migration: processing up to ID % (total responses: %)', end_id, total_count;

    FOR current_id IN SELECT * FROM generate_series(start_id, end_id, chunk_size)
    LOOP
        -- Process only responses that have missing or incorrect field data
        FOR response_record IN 
            WITH form_response_fields AS (
                -- Extract expected fields from the response data
                SELECT
                    r.id as "responseId",
                    r."formId",
                    field->>'id' as "fieldId",
                    field->>'type' as "fieldType",
                    response_value->>'value' as raw_value,
                    jsonb_typeof(response_value->'value') as value_type,
                    -- Extract array values for multiselect
                    CASE
                        WHEN field->>'type' = 'multiselect' AND jsonb_typeof(response_value->'value') = 'array'
                        THEN ARRAY(SELECT jsonb_array_elements_text(response_value->'value'))
                    END as expected_array,
                    -- Extract first element for select type when it's an array
                    CASE
                        WHEN field->>'type' = 'select' AND jsonb_typeof(response_value->'value') = 'array'
                        THEN (response_value->'value'->0)::text
                        WHEN field->>'type' = 'select' AND jsonb_typeof(response_value->'value') = 'string'
                        THEN response_value->>'value'
                    END as expected_select_value
                FROM "App_RoutingForms_FormResponse" r
                CROSS JOIN LATERAL jsonb_array_elements(
                    (
                        SELECT fields::jsonb
                        FROM "App_RoutingForms_Form" f
                        WHERE f.id = r."formId"
                    )
                ) as field
                CROSS JOIN LATERAL (
                    SELECT r.response::jsonb->(field->>'id') as response_value
                ) as rv
                WHERE r.id BETWEEN current_id AND current_id + chunk_size - 1
                AND r.response::jsonb ? (field->>'id')  -- Only include fields that exist in response
            ),
            responses_needing_update AS (
                SELECT DISTINCT f."responseId"
                FROM form_response_fields f
                LEFT JOIN "RoutingFormResponseField" rf ON
                    rf."responseId" = f."responseId" AND
                    rf."fieldId" = f."fieldId"
                WHERE
                    -- Case 1: Field doesn't exist in denormalized table
                    rf.id IS NULL OR
                    -- Case 2: Multiselect field validation - compare actual array contents
                    (f."fieldType" = 'multiselect' AND f.value_type = 'array' AND (
                        rf."valueStringArray" IS NULL OR
                        rf."valueStringArray" != f.expected_array OR
                        array_length(rf."valueStringArray", 1) != array_length(f.expected_array, 1)
                    )) OR
                    -- Case 3: Number field validation - compare as numbers
                    (f."fieldType" = 'number' AND f.value_type = 'number' AND (
                        rf."valueNumber" IS NULL OR
                        rf."valueNumber" != (f.raw_value)::decimal
                    )) OR
                    -- Case 4: Select field validation - compare expected select value
                    (f."fieldType" = 'select' AND (
                        rf."valueString" IS NULL OR
                        rf."valueString" != f.expected_select_value
                    )) OR
                    -- Case 5: Other string field validation
                    (f."fieldType" NOT IN ('multiselect', 'number', 'select') AND (
                        rf."valueString" IS NULL OR
                        rf."valueString" != f.raw_value
                    ))
            )
            SELECT r.id
            FROM responses_needing_update rnu
            INNER JOIN "App_RoutingForms_FormResponse" r ON r.id = rnu."responseId"
            ORDER BY r.id
        LOOP
            BEGIN
                -- Use the reprocess_routing_form_response_fields function
                PERFORM reprocess_routing_form_response_fields(response_record.id);
                chunk_updated_count := chunk_updated_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to process responseId %: %', response_record.id, SQLERRM;
                CONTINUE;
            END;
        END LOOP;
        
        processed_count := processed_count + chunk_updated_count;
        
        RAISE NOTICE 'Chunk processed: IDs %-% (updated: % records, total updated: %)', 
            current_id, current_id + chunk_size - 1, chunk_updated_count, processed_count;
        
        -- Reset chunk counter for next iteration
        chunk_updated_count := 0;
        
        -- Sleep after each chunk (outside transaction to avoid holding locks)
        PERFORM pg_sleep(sleep_interval);
    END LOOP;
    
    RAISE NOTICE 'Migration completed: processed up to ID % (total updated: % records out of % total records)', 
        end_id, processed_count, total_count;
END $$;