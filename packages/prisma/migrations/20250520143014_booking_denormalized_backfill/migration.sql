DO $$
DECLARE
    chunk_size INTEGER := 1000;
    start_id INTEGER := 1;      -- Starting ID
    end_id INTEGER;             -- Will be set dynamically
    current_id INTEGER;
    sleep_interval FLOAT := 1;  -- Sleep duration in seconds
    missing_records_exist BOOLEAN;
BEGIN
    -- Get the maximum ID from the Booking table
    SELECT COALESCE(MAX(id), 0) INTO end_id FROM "Booking";

    FOR current_id IN SELECT * FROM generate_series(start_id, end_id, chunk_size)
    LOOP
        -- Check if there are any Booking records that don't exist in BookingDenormalized
        SELECT EXISTS (
            SELECT 1
            FROM "Booking" b
            LEFT JOIN "BookingDenormalized" bd ON b.id = bd.id
            WHERE b.id BETWEEN current_id AND current_id + chunk_size - 1
            AND bd.id IS NULL
        ) INTO missing_records_exist;

        -- Only proceed with INSERT if there are actually missing records
        IF missing_records_exist THEN
            INSERT INTO "BookingDenormalized" (
                id, uid, "eventTypeId", title, description, "startTime", "endTime",
                "createdAt", "updatedAt", location, paid, status, rescheduled,
                "userId", "teamId", "eventLength", "eventParentId", "userEmail",
                "userUsername", "ratingFeedback", rating, "noShowHost",
                "isTeamBooking"
            )
            SELECT
                b.id, b.uid, b."eventTypeId", b.title, b.description,
                b."startTime", b."endTime", b."createdAt", b."updatedAt",
                b.location, b.paid, b.status, b.rescheduled, b."userId",
                et."teamId", et.length as "eventLength",
                et."parentId" as "eventParentId", u.email as "userEmail",
                u.username as "userUsername", b."ratingFeedback", b.rating,
                b."noShowHost",
                COALESCE(et."teamId", 0) > 0 as "isTeamBooking"
            FROM "Booking" b
            LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
            LEFT JOIN "users" u ON u.id = b."userId"
            WHERE b.id BETWEEN current_id AND current_id + chunk_size - 1
            AND NOT EXISTS (
                SELECT 1 FROM "BookingDenormalized" bd WHERE bd.id = b.id
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;

        PERFORM pg_sleep(sleep_interval);  -- Using the declared sleep_interval
    END LOOP;
END $$;
