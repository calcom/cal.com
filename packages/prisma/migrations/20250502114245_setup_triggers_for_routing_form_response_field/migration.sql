-- Add index for valueString (lowercase)
CREATE INDEX "RoutingFormResponseField_valueString_idx" ON "RoutingFormResponseField" (LOWER("valueString"));

-- Create function to handle form response field denormalization
CREATE OR REPLACE FUNCTION handle_routing_form_response_fields()
RETURNS TRIGGER AS $$
DECLARE
    form_fields jsonb;
    field_record jsonb;
    response_field jsonb;
    field_type text;
BEGIN
    -- Get the fields from App_RoutingForms_Form
    SELECT fields::jsonb INTO form_fields
    FROM "App_RoutingForms_Form"
    WHERE id = NEW."formId";

    -- Delete existing entries for this response
    DELETE FROM "RoutingFormResponseField"
    WHERE "responseId" = NEW.id;

    -- Iterate through each field in the response
    FOR field_record IN SELECT * FROM jsonb_array_elements(form_fields)
    LOOP
        -- Get the response field object for this field
        response_field := NEW.response::jsonb->(field_record->>'id');
        
        -- Skip if no response for this field
        CONTINUE WHEN response_field IS NULL;
        
        -- Get field type
        field_type := field_record->>'type';

        -- Insert new record based on field type
        IF field_type = 'multiselect' THEN
            -- Handle array values for multiselect
            -- Only insert if value is not null and is a valid JSON array
            IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'array' THEN
                INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueStringArray")
                VALUES (
                    NEW.id,
                    field_record->>'id',
                    ARRAY(SELECT jsonb_array_elements_text(response_field->'value'))
                );
            END IF;
        ELSIF field_type = 'number' THEN
            -- Handle number values
            -- Only insert if value is not null and is a valid number
            IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'number' THEN
                INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueNumber")
                VALUES (
                    NEW.id,
                    field_record->>'id',
                    (response_field->>'value')::decimal
                );
            END IF;
        ELSE
            -- Handle all other types as strings
            -- Only insert if value is not null and is a valid string
            IF response_field->>'value' IS NOT NULL AND jsonb_typeof(response_field->'value') = 'string' THEN
                INSERT INTO "RoutingFormResponseField" ("responseId", "fieldId", "valueString")
                VALUES (
                    NEW.id,
                    field_record->>'id',
                    response_field->>'value'
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER routing_form_response_insert_trigger
    AFTER INSERT ON "App_RoutingForms_FormResponse"
    FOR EACH ROW
    EXECUTE FUNCTION handle_routing_form_response_fields();

-- Create trigger for UPDATE
CREATE TRIGGER routing_form_response_update_trigger
    AFTER UPDATE ON "App_RoutingForms_FormResponse"
    FOR EACH ROW
    WHEN (OLD.response IS DISTINCT FROM NEW.response)
    EXECUTE FUNCTION handle_routing_form_response_fields();

