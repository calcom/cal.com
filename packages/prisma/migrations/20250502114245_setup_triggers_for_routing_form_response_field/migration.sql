-- Create function to handle form response field denormalization
CREATE OR REPLACE FUNCTION handle_routing_form_response_fields()
RETURNS TRIGGER AS $$
DECLARE
    form_fields jsonb;
    field_record jsonb;
    response_field jsonb;
    field_type text;
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

    -- Validate response_data exists and is a valid JSON object
    IF response_data IS NULL OR jsonb_typeof(response_data) != 'object' THEN
        RAISE WARNING 'Invalid response data for id %. Type: %', NEW.id, COALESCE(jsonb_typeof(response_data), 'null');
        RETURN NEW;
    END IF;

    -- Get the fields from App_RoutingForms_Form
    SELECT fields::jsonb INTO form_fields
    FROM "App_RoutingForms_Form"
    WHERE id = form_id;

    -- Delete existing entries for this response
    DELETE FROM "RoutingFormResponseField"
    WHERE "responseId" = NEW.id;

    -- Exit early if form_fields is NULL or not an array
    IF form_fields IS NULL OR jsonb_typeof(form_fields) != 'array' THEN
        RAISE WARNING 'form_fields is NULL or not an array for formId %, skipping processing', form_id;
        RETURN NEW;
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
                -- Only insert if value is not null and is a valid JSON array
                IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'array' THEN
                    BEGIN
                        INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueStringArray")
                        VALUES (
                            NEW.id,
                            field_record->>'id',
                            ARRAY(SELECT jsonb_array_elements_text(response_field->'value'))
                        );
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert multiselect values for field %', field_record->>'id';
                    END;
                END IF;
            ELSIF field_type = 'number' THEN
                -- Handle number values
                -- Only insert if value is not null and is a valid number
                IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'number' THEN
                    BEGIN
                        INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueNumber")
                        VALUES (
                            NEW.id,
                            field_record->>'id',
                            (response_field->>'value')::decimal
                        );
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to insert number value for field %', field_record->>'id';
                    END;
                END IF;
            ELSE
                -- Handle all other types as strings
                -- Only insert if value is not null and is a valid string
                IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'string' THEN
                    BEGIN
                        INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                        VALUES (
                            NEW.id,
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

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any unhandled errors and continue
    RAISE WARNING 'Unhandled error in handle_routing_form_response_fields for response %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT on RoutingFormResponseDenormalized
CREATE TRIGGER routing_form_response_denormalized_insert_trigger
    AFTER INSERT ON "RoutingFormResponseDenormalized"
    FOR EACH ROW
    EXECUTE FUNCTION handle_routing_form_response_fields();

-- Create trigger for UPDATE on App_RoutingForms_FormResponse
CREATE TRIGGER routing_form_response_update_trigger
    AFTER UPDATE OF response ON "App_RoutingForms_FormResponse"
    FOR EACH ROW
    EXECUTE FUNCTION handle_routing_form_response_fields();

