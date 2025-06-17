DO $$
DECLARE
    chunk_size INTEGER := 1000;
    start_id INTEGER := 1;
    end_id INTEGER;
    current_id INTEGER;
    sleep_interval FLOAT := 1;
    response_record RECORD;
    form_fields jsonb;
    field_record jsonb;
    response_field jsonb;
    field_type text;
BEGIN
    -- Get the maximum ID from App_RoutingForms_FormResponse table
    SELECT COALESCE(MAX(id), 0) INTO end_id FROM "App_RoutingForms_FormResponse";

    FOR current_id IN SELECT * FROM generate_series(start_id, end_id, chunk_size)
    LOOP
        -- Process each response in the chunk
        FOR response_record IN 
            SELECT 
                r.id,
                r."formId",
                r.response::jsonb as response_data
            FROM "App_RoutingForms_FormResponse" r
            WHERE r.id BETWEEN current_id AND current_id + chunk_size - 1
        LOOP
            -- Skip if response data is invalid
            IF response_record.response_data IS NULL OR jsonb_typeof(response_record.response_data) != 'object' THEN
                RAISE WARNING 'Invalid response data for responseId %. Type: %', 
                    response_record.id, 
                    COALESCE(jsonb_typeof(response_record.response_data), 'null');
                CONTINUE;
            END IF;

            -- Get form fields
            SELECT fields::jsonb INTO form_fields
            FROM "App_RoutingForms_Form"
            WHERE id = response_record."formId";

            -- Skip if form fields are invalid
            IF form_fields IS NULL OR jsonb_typeof(form_fields) != 'array' THEN
                RAISE WARNING 'Invalid form fields for responseId % formId %. Type: %', 
                    response_record.id,
                    response_record."formId",
                    COALESCE(jsonb_typeof(form_fields), 'null');
                CONTINUE;
            END IF;

            -- Process each field
            FOR field_record IN SELECT * FROM jsonb_array_elements(form_fields)
            LOOP
                BEGIN
                    -- Skip if field is invalid
                    IF field_record->>'id' IS NULL THEN
                        RAISE WARNING 'Field record is missing id property for responseId %, skipping field', response_record.id;
                        CONTINUE;
                    END IF;
                    IF field_record->>'type' IS NULL THEN
                        RAISE WARNING 'Field record % is missing type property for responseId %, skipping field', field_record->>'id', response_record.id;
                        CONTINUE;
                    END IF;

                    -- Overwrite
                    DELETE FROM "RoutingFormResponseField" rf
                    WHERE rf."responseId" = response_record.id
                      AND rf."fieldId" = field_record->>'id';
                    -- Skip if this field already exists for this response
                    -- IF EXISTS (
                    --     SELECT 1 FROM "RoutingFormResponseField" rf 
                    --     WHERE rf."responseId" = response_record.id 
                    --     AND rf."fieldId" = field_record->>'id'
                    -- ) THEN
                    --     CONTINUE;
                    -- END IF;

                    -- Get response for this field
                    response_field := response_record.response_data->(field_record->>'id');
                    IF response_field IS NULL THEN
                        CONTINUE;
                    END IF;

                    -- Get field type
                    field_type := field_record->>'type';

                    -- Insert based on field type
                    IF field_type = 'multiselect' THEN
                        -- Handle array values for multiselect
                        IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'array' THEN
                            BEGIN
                                INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueStringArray")
                                VALUES (
                                    response_record.id,
                                    field_record->>'id',
                                    ARRAY(SELECT jsonb_array_elements_text(response_field->'value'))
                                );
                            EXCEPTION WHEN OTHERS THEN
                                RAISE WARNING 'Failed to insert multiselect values for responseId % field %', response_record.id, field_record->>'id';
                            END;
                        END IF;
                    ELSIF field_type = 'number' THEN
                        -- Handle number values
                        -- Accept both JSON number values and string values that can be converted to numbers
                        IF response_field->>'value' IS NOT NULL THEN
                            BEGIN
                                IF jsonb_typeof(response_field->'value') = 'number' THEN
                                    -- If it's already a JSON number, use it directly
                                    INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueNumber")
                                    VALUES (
                                        response_record.id,
                                        field_record->>'id',
                                        (response_field->>'value')::decimal
                                    );
                                ELSIF jsonb_typeof(response_field->'value') = 'string' THEN
                                    -- If it's a string, try to convert it to a number
                                    INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueNumber")
                                    VALUES (
                                        response_record.id,
                                        field_record->>'id',
                                        (response_field->>'value')::decimal
                                    );
                                END IF;
                            EXCEPTION WHEN OTHERS THEN
                                RAISE WARNING 'Failed to insert number value for responseId % field % (value: %)', response_record.id, field_record->>'id', response_field->>'value';
                            END;
                        END IF;
                    ELSIF field_type = 'select' THEN
                        -- Handle select values - can be either string or array
                        IF response_field->>'value' IS NOT NULL THEN
                            BEGIN
                                IF jsonb_typeof(response_field->'value') = 'array' THEN
                                    -- If it's an array, take the first element
                                    INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                                    VALUES (
                                        response_record.id,
                                        field_record->>'id',
                                        response_field->'value'->>0
                                    );
                                ELSIF jsonb_typeof(response_field->'value') = 'string' THEN
                                    -- If it's a string, use it directly
                                    INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                                    VALUES (
                                        response_record.id,
                                        field_record->>'id',
                                        response_field->>'value'
                                    );
                                END IF;
                            EXCEPTION WHEN OTHERS THEN
                                RAISE WARNING 'Failed to insert select value for responseId % field %', response_record.id, field_record->>'id';
                            END;
                        END IF;
                    ELSE
                        -- Handle all other types as strings
                        IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'string' THEN
                            BEGIN
                                INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                                VALUES (
                                    response_record.id,
                                    field_record->>'id',
                                    response_field->>'value'
                                );
                            EXCEPTION WHEN OTHERS THEN
                                RAISE WARNING 'Failed to insert string value for responseId % field %', response_record.id, field_record->>'id';
                            END;
                        END IF;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error processing responseId % field %: Database operation failed', response_record.id, field_record->>'id';
                    CONTINUE;
                END;
            END LOOP;
        END LOOP;

        PERFORM pg_sleep(sleep_interval);
    END LOOP;
END $$;