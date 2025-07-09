-- Step 1: Add column as nullable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN "uuid" TEXT;

-- Step 2: Populate existing rows with UUIDs
UPDATE "App_RoutingForms_FormResponse" SET "uuid" = gen_random_uuid()::text WHERE "uuid" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "App_RoutingForms_FormResponse" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX "App_RoutingForms_FormResponse_uuid_key" ON "App_RoutingForms_FormResponse"("uuid");

-- Step 5: Add UUID to RoutingFormResponseDenormalized
ALTER TABLE "RoutingFormResponseDenormalized" ADD COLUMN "uuid" TEXT;

-- Step 6: Populate existing rows with UUIDs
UPDATE "RoutingFormResponseDenormalized" d
SET "uuid" = f."uuid"
FROM "App_RoutingForms_FormResponse" f
WHERE d."id" = f."id";

-- Step 7: Make column NOT NULL
ALTER TABLE "RoutingFormResponseDenormalized" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 8: Add unique constraint
CREATE UNIQUE INDEX "RoutingFormResponseDenormalized_uuid_key" ON "RoutingFormResponseDenormalized"("uuid");

-- Step 9: Add UUID to RoutingFormResponseDenormalized
CREATE OR REPLACE FUNCTION refresh_routing_form_response_denormalized(response_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing entry if any
    DELETE FROM "RoutingFormResponseDenormalized" WHERE id = response_id;
    
    -- Insert form response with all related data
    INSERT INTO "RoutingFormResponseDenormalized" (
        id,
        uuid,
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
        r."uuid",
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
    INNER JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
    INNER JOIN "users" u ON f."userId" = u.id
    LEFT JOIN "Booking" b ON b.uid = r."routedToBookingUid"
    LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
    LEFT JOIN "Tracking" t ON t."bookingId" = b.id
    WHERE r.id = response_id;
END;
$$ LANGUAGE plpgsql;