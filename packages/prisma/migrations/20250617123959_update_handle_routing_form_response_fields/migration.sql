-- Shared function that contains the core processing logic
CREATE OR REPLACE FUNCTION _process_routing_form_response_fields(response_id integer, response_data jsonb, form_id text)
RETURNS void AS $$
DECLARE
    form_fields jsonb;
    field_record jsonb;
    response_field jsonb;
    field_type text;
BEGIN
    -- Validate response_data exists and is a valid JSON object
    IF response_data IS NULL OR jsonb_typeof(response_data) != 'object' THEN
        RAISE WARNING 'Invalid response data for id %. Type: %', response_id, COALESCE(jsonb_typeof(response_data), 'null');
        RETURN;
    END IF;
    
    -- Get the fields from App_RoutingForms_Form
    SELECT fields::jsonb INTO form_fields
    FROM "App_RoutingForms_Form"
    WHERE id = form_id;
    
    -- Delete existing entries for this response
    DELETE FROM "RoutingFormResponseField"
    WHERE "responseId" = response_id;
    
    -- Exit early if form_fields is NULL or not an array
    IF form_fields IS NULL OR jsonb_typeof(form_fields) != 'array' THEN
        RAISE WARNING 'form_fields is NULL or not an array for formId %, skipping processing', form_id;
        RETURN;
    END IF;
    
    -- Iterate through each field in the response
    FOR field_record IN SELECT * FROM jsonb_array_elements(form_fields)
    LOOP
        BEGIN
            -- Validate field_record has required properties
            IF field_record->>'id' IS NULL THEN
                RAISE WARNING 'Field record is missing id property, skipping field';
                CONTINUE;
            END IF;
            IF field_record->>'type' IS NULL THEN
                RAISE WARNING 'Field record % is missing type property, skipping field', field_record->>'id';
                CONTINUE;
            END IF;
            
            -- Get the response field object for this field
            response_field := response_data->(field_record->>'id');
            
            -- Skip if no response for this field
            IF response_field IS NULL THEN
                CONTINUE;
            END IF;
            
            -- Get field type
            field_type := field_record->>'type';
            
            -- Insert new record based on field type
            IF field_type = 'multiselect' THEN
                -- Handle array values for multiselect
                -- Accept both array values and string values
                IF response_field->>'value' IS NOT NULL THEN
                    BEGIN
                        IF jsonb_typeof(response_field->'value') = 'array' THEN
                            -- If it's already an array, use it directly
                            INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueStringArray")
                            VALUES (
                                response_id,
                                field_record->>'id',
                                ARRAY(SELECT jsonb_array_elements_text(response_field->'value'))
                            );
                        ELSIF jsonb_typeof(response_field->'value') = 'string' THEN
                            -- If it's a string, convert it to a single-element array
                            INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueStringArray")
                            VALUES (
                                response_id,
                                field_record->>'id',
                                ARRAY[response_field->>'value']
                            );
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert multiselect values for field %', field_record->>'id';
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
                                response_id,
                                field_record->>'id',
                                (response_field->>'value')::decimal
                            );
                        ELSIF jsonb_typeof(response_field->'value') = 'string' THEN
                            -- If it's a string, try to convert it to a number
                            INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueNumber")
                            VALUES (
                                response_id,
                                field_record->>'id',
                                (response_field->>'value')::decimal
                            );
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert number value for field % (value: %)', field_record->>'id', response_field->>'value';
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
                                response_id,
                                field_record->>'id',
                                (response_field->'value'->>0)
                            );
                        ELSIF jsonb_typeof(response_field->'value') = 'string' THEN
                            -- If it's a string, use it directly
                            INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                            VALUES (
                                response_id,
                                field_record->>'id',
                                response_field->>'value'
                            );
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert select value for field %', field_record->>'id';
                    END;
                END IF;
            ELSE
                -- Handle all other types as strings
                -- Only insert if value is not null and is a valid string
                IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'string' THEN
                    BEGIN
                        INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                        VALUES (
                            response_id,
                            field_record->>'id',
                            response_field->>'value'
                        );
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert string value for field %', field_record->>'id';
                    END;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Log the error and continue processing other fields
            RAISE WARNING 'Error processing field %', field_record->>'id';
            CONTINUE;
        END;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    -- Log any unhandled errors and continue
    RAISE WARNING 'Unhandled error in _process_routing_form_response_fields for response %', response_id;
END;
$$ LANGUAGE plpgsql;

-- Updated trigger function that uses the shared core function
CREATE OR REPLACE FUNCTION handle_routing_form_response_fields()
RETURNS TRIGGER AS $$
DECLARE
    response_data jsonb;
    form_id text;
BEGIN
    -- For INSERT trigger on RoutingFormResponseDenormalized, we need to get the response data from App_RoutingForms_FormResponse
    -- For UPDATE trigger on App_RoutingForms_FormResponse, we can use NEW.response directly
    IF TG_TABLE_NAME = 'RoutingFormResponseDenormalized' THEN
        SELECT response, "formId" INTO response_data, form_id
        FROM "App_RoutingForms_FormResponse"
        WHERE id = NEW.id;
    ELSE
        response_data := NEW.response::jsonb;
        form_id := NEW."formId";
    END IF;
    
    -- Call the shared core function
    PERFORM _process_routing_form_response_fields(NEW.id, response_data, form_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- New function to reprocess routing form response fields for a specific response ID
CREATE OR REPLACE FUNCTION reprocess_routing_form_response_fields(response_id integer)
RETURNS void AS $$
DECLARE
    response_data jsonb;
    form_id text;
BEGIN
    -- Get the response data and form ID from App_RoutingForms_FormResponse
    SELECT response, "formId" INTO response_data, form_id
    FROM "App_RoutingForms_FormResponse"
    WHERE id = response_id;
    
    -- Check if the response exists
    IF response_data IS NULL THEN
        RAISE EXCEPTION 'Response with id % not found', response_id;
    END IF;
    
    -- Call the shared core function
    PERFORM _process_routing_form_response_fields(response_id, response_data, form_id);
END;
$$ LANGUAGE plpgsql;
