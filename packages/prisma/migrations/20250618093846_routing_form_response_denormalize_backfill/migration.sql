DO $$
DECLARE
    chunk_size INTEGER := 1000;
    start_id INTEGER := 1;      -- Starting ID
    end_id INTEGER;             -- Will be set dynamically
    current_id INTEGER;

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
        -- Use UPSERT to only update records that are missing or have incorrect data
        WITH expected_data AS (
            SELECT 
                r.id,
                r."formId" as expected_form_id,
                f.name as expected_form_name,
                f."teamId" as expected_form_team_id,
                f."userId" as expected_form_user_id,
                b.uid as expected_booking_uid,
                b.id as expected_booking_id,
                b.status as expected_booking_status,
                calculate_booking_status_order(b.status::text) as expected_booking_status_order,
                b."createdAt" as expected_booking_created_at,
                b."startTime" as expected_booking_start_time,
                b."endTime" as expected_booking_end_time,
                b."userId" as expected_booking_user_id,
                u.name as expected_booking_user_name,
                u.email as expected_booking_user_email,
                u."avatarUrl" as expected_booking_user_avatar_url,
                COALESCE(
                    (
                        SELECT ar."reasonString"
                        FROM "AssignmentReason" ar
                        WHERE ar."bookingId" = b.id
                        LIMIT 1
                    ),
                    ''
                ) as expected_booking_assignment_reason,
                et.id as expected_event_type_id,
                et."parentId" as expected_event_type_parent_id,
                et."schedulingType"::text as expected_event_type_scheduling_type,
                r."createdAt" as expected_created_at,
                t.utm_source as expected_utm_source,
                t.utm_medium as expected_utm_medium,
                t.utm_campaign as expected_utm_campaign,
                t.utm_term as expected_utm_term,
                t.utm_content as expected_utm_content
            FROM "App_RoutingForms_FormResponse" r
            INNER JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
            LEFT JOIN "users" u ON f."userId" = u.id
            LEFT JOIN "Booking" b ON b.uid = r."routedToBookingUid"
            LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
            LEFT JOIN "Tracking" t ON t."bookingId" = b.id
            WHERE r.id BETWEEN current_id AND current_id + chunk_size - 1
        ),
        records_to_update AS (
            SELECT e.*
            FROM expected_data e
            LEFT JOIN "RoutingFormResponseDenormalized" d ON e.id = d.id
            WHERE CASE 
                WHEN d.id IS NULL THEN true  -- Include missing records
                WHEN d."formId" IS DISTINCT FROM e.expected_form_id THEN true
                WHEN d."formName" IS DISTINCT FROM e.expected_form_name THEN true
                WHEN d."formTeamId" IS DISTINCT FROM e.expected_form_team_id THEN true
                WHEN d."formUserId" IS DISTINCT FROM e.expected_form_user_id THEN true
                WHEN d."bookingUid" IS DISTINCT FROM e.expected_booking_uid THEN true
                WHEN d."bookingId" IS DISTINCT FROM e.expected_booking_id THEN true
                WHEN d."bookingStatus" IS DISTINCT FROM e.expected_booking_status THEN true
                WHEN d."bookingStatusOrder" IS DISTINCT FROM e.expected_booking_status_order THEN true
                WHEN d."bookingCreatedAt" IS DISTINCT FROM e.expected_booking_created_at THEN true
                WHEN d."bookingStartTime" IS DISTINCT FROM e.expected_booking_start_time THEN true
                WHEN d."bookingEndTime" IS DISTINCT FROM e.expected_booking_end_time THEN true
                WHEN d."bookingUserId" IS DISTINCT FROM e.expected_booking_user_id THEN true
                WHEN d."bookingUserName" IS DISTINCT FROM e.expected_booking_user_name THEN true
                WHEN d."bookingUserEmail" IS DISTINCT FROM e.expected_booking_user_email THEN true
                WHEN d."bookingUserAvatarUrl" IS DISTINCT FROM e.expected_booking_user_avatar_url THEN true
                WHEN d."bookingAssignmentReason" IS DISTINCT FROM e.expected_booking_assignment_reason THEN true
                WHEN d."eventTypeId" IS DISTINCT FROM e.expected_event_type_id THEN true
                WHEN d."eventTypeParentId" IS DISTINCT FROM e.expected_event_type_parent_id THEN true
                WHEN d."eventTypeSchedulingType"::text IS DISTINCT FROM e.expected_event_type_scheduling_type THEN true
                WHEN d."createdAt" IS DISTINCT FROM e.expected_created_at THEN true
                WHEN d."utm_source" IS DISTINCT FROM e.expected_utm_source THEN true
                WHEN d."utm_medium" IS DISTINCT FROM e.expected_utm_medium THEN true
                WHEN d."utm_campaign" IS DISTINCT FROM e.expected_utm_campaign THEN true
                WHEN d."utm_term" IS DISTINCT FROM e.expected_utm_term THEN true
                WHEN d."utm_content" IS DISTINCT FROM e.expected_utm_content THEN true
                ELSE false  -- Don't include valid records
            END
        )
        INSERT INTO "RoutingFormResponseDenormalized" (
            id,
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
            r.expected_form_id,
            r.expected_form_name,
            r.expected_form_team_id,
            r.expected_form_user_id,
            r.expected_booking_uid,
            r.expected_booking_id,
            r.expected_booking_status,
            r.expected_booking_status_order,
            r.expected_booking_created_at,
            r.expected_booking_start_time,
            r.expected_booking_end_time,
            r.expected_booking_user_id,
            r.expected_booking_user_name,
            r.expected_booking_user_email,
            r.expected_booking_user_avatar_url,
            r.expected_booking_assignment_reason,
            r.expected_event_type_id,
            r.expected_event_type_parent_id,
            r.expected_event_type_scheduling_type::text,
            r.expected_created_at,
            r.expected_utm_source,
            r.expected_utm_medium,
            r.expected_utm_campaign,
            r.expected_utm_term,
            r.expected_utm_content
        FROM records_to_update r
        ON CONFLICT (id) DO UPDATE SET
            "formId" = EXCLUDED."formId",
            "formName" = EXCLUDED."formName",
            "formTeamId" = EXCLUDED."formTeamId",
            "formUserId" = EXCLUDED."formUserId",
            "bookingUid" = EXCLUDED."bookingUid",
            "bookingId" = EXCLUDED."bookingId",
            "bookingStatus" = EXCLUDED."bookingStatus",
            "bookingStatusOrder" = EXCLUDED."bookingStatusOrder",
            "bookingCreatedAt" = EXCLUDED."bookingCreatedAt",
            "bookingStartTime" = EXCLUDED."bookingStartTime",
            "bookingEndTime" = EXCLUDED."bookingEndTime",
            "bookingUserId" = EXCLUDED."bookingUserId",
            "bookingUserName" = EXCLUDED."bookingUserName",
            "bookingUserEmail" = EXCLUDED."bookingUserEmail",
            "bookingUserAvatarUrl" = EXCLUDED."bookingUserAvatarUrl",
            "bookingAssignmentReason" = EXCLUDED."bookingAssignmentReason",
            "eventTypeId" = EXCLUDED."eventTypeId",
            "eventTypeParentId" = EXCLUDED."eventTypeParentId",
            "eventTypeSchedulingType" = EXCLUDED."eventTypeSchedulingType",
            "createdAt" = EXCLUDED."createdAt",
            "utm_source" = EXCLUDED."utm_source",
            "utm_medium" = EXCLUDED."utm_medium",
            "utm_campaign" = EXCLUDED."utm_campaign",
            "utm_term" = EXCLUDED."utm_term",
            "utm_content" = EXCLUDED."utm_content";
        
        GET DIAGNOSTICS chunk_updated_count = ROW_COUNT;
        processed_count := processed_count + chunk_updated_count;
        
        RAISE NOTICE 'Chunk processed: IDs %-% (updated/inserted: % records, total updated: %)', 
            current_id, current_id + chunk_size - 1, chunk_updated_count, processed_count;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: processed up to ID % (total updated/inserted: % records out of % total records)', 
        end_id, processed_count, total_count;
END $$;