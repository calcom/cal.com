DO $$
DECLARE
    chunk_size INTEGER := 1000;
    start_id INTEGER := 1;      -- Starting ID
    end_id INTEGER;             -- Will be set dynamically
    current_id INTEGER;
    sleep_interval FLOAT := 1;  -- Sleep duration in seconds
    missing_records_exist BOOLEAN;
    processed_count INTEGER := 0;
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
        -- Check if there are any FormResponse records that don't exist in RoutingFormResponseDenormalized
        SELECT EXISTS (
            SELECT 1
            FROM "App_RoutingForms_FormResponse" r
            LEFT JOIN "RoutingFormResponseDenormalized" rd ON r.id = rd.id
            WHERE r.id BETWEEN current_id AND current_id + chunk_size - 1
            AND rd.id IS NULL
        ) INTO missing_records_exist;

        -- Only proceed with INSERT if there are actually missing records
        IF missing_records_exist THEN
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
            LEFT JOIN "users" u ON f."userId" = u.id
            LEFT JOIN "Booking" b ON b.uid = r."routedToBookingUid"
            LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
            LEFT JOIN "Tracking" t ON t."bookingId" = b.id
            WHERE r.id BETWEEN current_id AND current_id + chunk_size - 1
            AND NOT EXISTS (
                SELECT 1 FROM "RoutingFormResponseDenormalized" rd 
                WHERE rd.id = r.id
            )
            ON CONFLICT (id) DO NOTHING;
            processed_count := processed_count + chunk_size;
            
            RAISE NOTICE 'Chunk processed: IDs %-% (progress: %.1f%%)', 
                current_id, current_id + chunk_size - 1, 
                (processed_count::float / total_count * 100);
            
            PERFORM pg_sleep(sleep_interval);  -- Add delay between chunks
        ELSE
            RAISE NOTICE 'Chunk skipped: IDs %-% (no missing records)', current_id, current_id + chunk_size - 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: processed up to ID % (%.1f%% of total range)', 
        end_id, (end_id::float / total_count * 100);
END $$;

