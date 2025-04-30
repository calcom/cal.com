-- Create the denormalized table
CREATE TABLE "RoutingFormResponseDenormalized" (
    id INTEGER PRIMARY KEY,
    response JSONB NOT NULL DEFAULT '{}'::jsonb,
    "responseByFieldId" JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"57734f65-8bbb-4065-9e71-fb7f0b7485f8": "marta ortiz", ...} - text values are lowercased
    "formId" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "formTeamId" INTEGER,
    "formUserId" INTEGER,
    "bookingUid" TEXT,
    "bookingId" INTEGER,
    "bookingStatus" "BookingStatus",
    "bookingStatusOrder" INTEGER,
    "bookingCreatedAt" TIMESTAMP(3),
    "bookingStartTime" TIMESTAMP(3),
    "bookingEndTime" TIMESTAMP(3),
    "bookingUserId" INTEGER,
    "bookingUserName" TEXT,
    "bookingUserEmail" TEXT,
    "bookingUserAvatarUrl" TEXT,
    "bookingAssignmentReason" TEXT,
    -- EventType related fields
    "eventTypeId" INTEGER,
    "eventTypeParentId" INTEGER,
    "eventTypeSchedulingType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT
);

-- Create optimized indexes
CREATE INDEX idx_form_id ON "RoutingFormResponseDenormalized" ("formId");
CREATE INDEX idx_form_id_created_at ON "RoutingFormResponseDenormalized" ("formId", "createdAt");
CREATE INDEX idx_routing_form_response_booking_id ON "RoutingFormResponseDenormalized" ("bookingId");
CREATE INDEX idx_routing_form_response_booking_user_id ON "RoutingFormResponseDenormalized" ("bookingUserId");
CREATE INDEX idx_response_by_field_id ON "RoutingFormResponseDenormalized" USING gin ("responseByFieldId");
CREATE INDEX idx_event_type_hierarchy ON "RoutingFormResponseDenormalized" ("eventTypeId", "eventTypeParentId");
CREATE INDEX idx_booking_assignment_reason_lower ON "RoutingFormResponseDenormalized" (LOWER("bookingAssignmentReason"));

-- Function to calculate bookingStatusOrder
CREATE OR REPLACE FUNCTION calculate_booking_status_order(status TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE status
        WHEN 'accepted' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'awaiting_host' THEN 3
        WHEN 'cancelled' THEN 4
        WHEN 'rejected' THEN 5
        ELSE 999  -- Default to end of sort order for unknown statuses
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to extract response by field ID with lowercase text values
CREATE OR REPLACE FUNCTION extract_response_by_field_id(response_json JSONB)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_object_agg(
            key,
            CASE
                WHEN jsonb_typeof(value->'value') = 'string'
                THEN to_jsonb(lower((value->>'value')::text))
                ELSE value->'value'
            END
        )
        FROM jsonb_each(response_json)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh a single form response's data
CREATE OR REPLACE FUNCTION refresh_routing_form_response_denormalized(response_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing entry if any
    DELETE FROM "RoutingFormResponseDenormalized" WHERE id = response_id;
    
    -- Insert form response with all related data
    INSERT INTO "RoutingFormResponseDenormalized" (
        id,
        response,
        "responseByFieldId",
        "formId",
        "formName",
        "formTeamId",
        "formUserId",
        "bookingUid",
        "bookingId",
        "bookingStatus",
        "bookingStatusOrder",
        "bookingCreatedAt",
        "bookingStartTime",
        "bookingEndTime",
        "bookingUserId",
        "bookingUserName",
        "bookingUserEmail",
        "bookingUserAvatarUrl",
        "bookingAssignmentReason",
        "eventTypeId",
        "eventTypeParentId",
        "eventTypeSchedulingType",
        "createdAt",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content"
    )
    SELECT 
        r.id,
        COALESCE(r.response::jsonb, '{}'::jsonb) as response,
        extract_response_by_field_id(COALESCE(r.response::jsonb, '{}'::jsonb)) as "responseByFieldId",
        r."formId",
        f.name as "formName",
        f."teamId" as "formTeamId",
        f."userId" as "formUserId",
        b.uid as "bookingUid",
        b.id as "bookingId",
        b.status as "bookingStatus",
        calculate_booking_status_order(b.status::text) as "bookingStatusOrder",
        b."createdAt" as "bookingCreatedAt",
        b."startTime" as "bookingStartTime",
        b."endTime" as "bookingEndTime",
        b."userId" as "bookingUserId",
        u.name as "bookingUserName",
        u.email as "bookingUserEmail",
        u."avatarUrl" as "bookingUserAvatarUrl",
        COALESCE(
            (
                SELECT ar."reasonString"
                FROM "AssignmentReason" ar
                WHERE ar."bookingId" = b.id
                LIMIT 1
            ),
            ''
        ) as "bookingAssignmentReason",
        et.id as "eventTypeId",
        et."parentId" as "eventTypeParentId",
        et."schedulingType" as "eventTypeSchedulingType",
        r."createdAt",
        t.utm_source,
        t.utm_medium,
        t.utm_campaign,
        t.utm_term,
        t.utm_content
    FROM "App_RoutingForms_FormResponse" r
    LEFT JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
    LEFT JOIN "Booking" b ON b.uid = r."routedToBookingUid"
    LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
    LEFT JOIN "users" u ON b."userId" = u.id
    LEFT JOIN "Tracking" t ON t."bookingId" = b.id
    WHERE r.id = response_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for form response changes (insert/update)
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        PERFORM refresh_routing_form_response_denormalized(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the original operation
        RAISE WARNING 'DENORM_ERROR: RoutingFormResponseDenormalized - refresh failed for response_id %. Error: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for form response deletions
CREATE OR REPLACE FUNCTION trigger_delete_routing_form_response_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "RoutingFormResponseDenormalized" WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for App_RoutingForms_FormResponse table
CREATE TRIGGER routing_form_response_insert_update_trigger
    AFTER INSERT OR UPDATE ON "App_RoutingForms_FormResponse"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized();

CREATE TRIGGER routing_form_response_delete_trigger
    AFTER DELETE ON "App_RoutingForms_FormResponse"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_routing_form_response_denormalized();

-- Trigger function for form changes
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized_form()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all responses for this form
    UPDATE "RoutingFormResponseDenormalized" rfrd
    SET
        "formName" = NEW.name,
        "formTeamId" = NEW."teamId",
        "formUserId" = NEW."userId"
    WHERE rfrd."formId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for App_RoutingForms_Form table
CREATE TRIGGER routing_form_update_trigger
    AFTER UPDATE OF name, "teamId", "userId" ON "App_RoutingForms_Form"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized_form();

-- Trigger function for booking changes
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all responses linked to this booking
    UPDATE "RoutingFormResponseDenormalized" rfrd
    SET
        "bookingStatus" = NEW.status,
        "bookingStatusOrder" = calculate_booking_status_order(NEW.status::text),
        "bookingCreatedAt" = NEW."createdAt",
        "bookingStartTime" = NEW."startTime",
        "bookingEndTime" = NEW."endTime"
    WHERE rfrd."bookingId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Booking table
CREATE TRIGGER booking_update_trigger_for_routing_form
    AFTER UPDATE OF status, "createdAt", "startTime", "endTime" ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized_booking();

-- Trigger function for user changes
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all responses where this user is the booking user
    UPDATE "RoutingFormResponseDenormalized" rfrd
    SET
        "bookingUserName" = NEW.name,
        "bookingUserEmail" = NEW.email,
        "bookingUserAvatarUrl" = NEW."avatarUrl"
    WHERE rfrd."bookingUserId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
CREATE TRIGGER user_update_trigger_for_routing_form
    AFTER UPDATE OF name, email, "avatarUrl" ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized_user();

-- Trigger function for EventType changes
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized_event_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all responses linked to this event type through bookings
    UPDATE "RoutingFormResponseDenormalized" rfrd
    SET
        "eventTypeParentId" = NEW."parentId",
        "eventTypeSchedulingType" = NEW."schedulingType"
    FROM "Booking" b
    WHERE b."eventTypeId" = NEW.id
    AND rfrd."bookingId" = b.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for EventType table
CREATE TRIGGER event_type_update_trigger_for_routing_form
    AFTER UPDATE OF "parentId", "schedulingType" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized_event_type();

