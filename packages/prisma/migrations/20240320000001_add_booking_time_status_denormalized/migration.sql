-- Create the denormalized table
CREATE TABLE "BookingTimeStatusDenormalized" (
    id INTEGER,
    uid TEXT,
    "eventTypeId" INTEGER,
    title TEXT,
    description TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    location TEXT,
    paid BOOLEAN,
    status TEXT,
    rescheduled BOOLEAN,
    "userId" INTEGER,
    "teamId" INTEGER,
    "eventLength" INTEGER,
    "timeStatus" TEXT,
    "eventParentId" INTEGER,
    "userEmail" TEXT,
    "username" TEXT,
    "ratingFeedback" TEXT,
    "rating" INTEGER,
    "noShowHost" BOOLEAN,
    "isTeamBooking" BOOLEAN
);

-- Create indexes to match likely query patterns
CREATE INDEX "idx_booking_id" ON "BookingTimeStatusDenormalized" (id);
CREATE INDEX "idx_booking_user_id" ON "BookingTimeStatusDenormalized" ("userId");
CREATE INDEX "idx_booking_created_at" ON "BookingTimeStatusDenormalized" ("createdAt");
CREATE INDEX "idx_event_type_hierarchy" ON "BookingTimeStatusDenormalized" ("eventTypeId", "eventParentId");
CREATE INDEX "idx_time_status" ON "BookingTimeStatusDenormalized" ("timeStatus");
CREATE INDEX "idx_team_id" ON "BookingTimeStatusDenormalized" ("teamId");
CREATE INDEX "idx_start_time" ON "BookingTimeStatusDenormalized" ("startTime");
CREATE INDEX "idx_end_time" ON "BookingTimeStatusDenormalized" ("endTime");

-- Function to calculate timeStatus
CREATE OR REPLACE FUNCTION calculate_time_status(
    rescheduled BOOLEAN,
    status TEXT,
    end_time TIMESTAMP
) RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN rescheduled IS TRUE THEN 'rescheduled'
        WHEN status = 'cancelled' AND rescheduled IS NULL THEN 'cancelled'
        WHEN end_time < now() THEN 'completed'
        WHEN end_time > now() THEN 'uncompleted'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate isTeamBooking
CREATE OR REPLACE FUNCTION calculate_is_team_booking(team_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN CASE WHEN team_id IS NULL THEN false ELSE true END;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh a single booking's data
CREATE OR REPLACE FUNCTION refresh_booking_time_status_denormalized(booking_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing entry if any
    DELETE FROM "BookingTimeStatusDenormalized" WHERE id = booking_id;
    
    -- Insert non-team booking
    INSERT INTO "BookingTimeStatusDenormalized"
    SELECT
        "Booking".id,
        "Booking".uid,
        "Booking"."eventTypeId",
        "Booking".title,
        "Booking".description,
        "Booking"."startTime",
        "Booking"."endTime",
        "Booking"."createdAt",
        "Booking".location,
        "Booking".paid,
        "Booking".status,
        "Booking".rescheduled,
        "Booking"."userId",
        et."teamId",
        et.length AS "eventLength",
        calculate_time_status("Booking".rescheduled, "Booking".status::text, "Booking"."endTime") AS "timeStatus",
        et."parentId" AS "eventParentId",
        "u"."email" AS "userEmail",
        "u"."username" AS "username",
        "Booking"."ratingFeedback",
        "Booking"."rating",
        "Booking"."noShowHost",
        calculate_is_team_booking(et."teamId") as "isTeamBooking"
    FROM "Booking"
    LEFT JOIN "EventType" et ON "Booking"."eventTypeId" = et.id
    LEFT JOIN users u ON u.id = "Booking"."userId"
    WHERE "Booking".id = booking_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for booking changes (insert/update)
CREATE OR REPLACE FUNCTION trigger_refresh_booking_time_status_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_booking_time_status_denormalized(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for booking deletions
CREATE OR REPLACE FUNCTION trigger_delete_booking_time_status_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "BookingTimeStatusDenormalized" WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for Booking table
CREATE TRIGGER booking_insert_update_trigger
    AFTER INSERT OR UPDATE ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized();

CREATE TRIGGER booking_delete_trigger
    AFTER DELETE ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_booking_time_status_denormalized();

-- Trigger function for EventType changes
CREATE OR REPLACE FUNCTION trigger_refresh_booking_time_status_denormalized_event_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh all bookings associated with this event type
    UPDATE "BookingTimeStatusDenormalized" btsd
    SET
        "teamId" = NEW."teamId",
        "eventLength" = NEW.length,
        "eventParentId" = NEW."parentId",
        "isTeamBooking" = calculate_is_team_booking(NEW."teamId")
    WHERE btsd."eventTypeId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for user changes
CREATE OR REPLACE FUNCTION trigger_refresh_booking_time_status_denormalized_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh all bookings associated with this user
    UPDATE "BookingTimeStatusDenormalized" btsd
    SET
        "userEmail" = NEW.email,
        "username" = NEW.username
    WHERE btsd."userId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for EventType table
CREATE TRIGGER event_type_update_trigger
    AFTER UPDATE OF "teamId", length, "parentId" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized_event_type();

-- Create triggers for users table
CREATE TRIGGER user_update_trigger
    AFTER UPDATE OF email, username ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized_user();


-- Populate the table with initial data
-- DELETE FROM "BookingTimeStatusDenormalized";
-- INSERT INTO "BookingTimeStatusDenormalized"
-- SELECT * FROM "BookingTimeStatus";
