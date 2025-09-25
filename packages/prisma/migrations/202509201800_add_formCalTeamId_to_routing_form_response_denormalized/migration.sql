-- Add formCalTeamId column to RoutingFormResponseDenormalized table
ALTER TABLE "RoutingFormResponseDenormalized" 
ADD COLUMN "formCalTeamId" INTEGER;

-- Add index for the new column
CREATE INDEX "RoutingFormResponseDenormalized_formCalTeamId_idx" 
ON "RoutingFormResponseDenormalized"("formCalTeamId");

-- Update the refresh function to include formCalTeamId
CREATE OR REPLACE FUNCTION refresh_routing_form_response_denormalized(response_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing entry if any
    DELETE FROM "RoutingFormResponseDenormalized" WHERE id = response_id;

    -- Insert form response with all related data including formCalTeamId
    INSERT INTO "RoutingFormResponseDenormalized" (
        id,
        "formId",
        "formName",
        "formTeamId",
        "formUserId",
        "formCalTeamId",
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
        r."formId",
        f.name as "formName",
        f."teamId" as "formTeamId",
        f."userId" as "formUserId",
        f."calIdTeamId" as "formCalTeamId",
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
    INNER JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
    LEFT JOIN "Booking" b ON b.uid = r."routedToBookingUid"
    LEFT JOIN "users" u ON b."userId" = u.id
    LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
    LEFT JOIN "Tracking" t ON t."bookingId" = b.id
    WHERE r.id = response_id;
END;
$$ LANGUAGE plpgsql;

-- Add trigger function for form calIdTeamId changes
CREATE OR REPLACE FUNCTION trigger_refresh_routing_form_response_denormalized_form_cal_team()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all responses for this form's calIdTeamId
    UPDATE "RoutingFormResponseDenormalized" rfrd
    SET "formCalTeamId" = NEW."calIdTeamId"
    WHERE rfrd."formId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for App_RoutingForms_Form calIdTeamId changes
DROP TRIGGER IF EXISTS routing_form_cal_team_update_trigger ON "App_RoutingForms_Form";
CREATE TRIGGER routing_form_cal_team_update_trigger
    AFTER UPDATE OF "calIdTeamId" ON "App_RoutingForms_Form"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_routing_form_response_denormalized_form_cal_team();

-- Backfill existing data with formCalTeamId
UPDATE "RoutingFormResponseDenormalized" rfrd
SET "formCalTeamId" = f."calIdTeamId"
FROM "App_RoutingForms_Form" f
WHERE rfrd."formId" = f.id;