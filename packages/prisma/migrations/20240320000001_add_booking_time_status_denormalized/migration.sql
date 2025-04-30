-- Create the denormalized table
CREATE TABLE "BookingTimeStatusDenormalized" (
    id INTEGER NOT NULL PRIMARY KEY,
    uid TEXT NOT NULL,
    "eventTypeId" INTEGER,
    title TEXT,
    description TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    location TEXT,
    paid BOOLEAN,
    status "BookingStatus" NOT NULL,
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
CREATE INDEX "idx_booking_user_id" ON "BookingTimeStatusDenormalized" ("userId");
CREATE INDEX "idx_booking_created_at" ON "BookingTimeStatusDenormalized" ("createdAt");
CREATE INDEX "idx_event_type_id" ON "BookingTimeStatusDenormalized" ("eventTypeId");
CREATE INDEX "idx_event_parent_id" ON "BookingTimeStatusDenormalized" ("eventParentId");
CREATE INDEX "idx_booking_time_status" ON "BookingTimeStatusDenormalized" ("timeStatus");
CREATE INDEX "idx_booking_team_id" ON "BookingTimeStatusDenormalized" ("teamId");
CREATE INDEX "idx_booking_start_time" ON "BookingTimeStatusDenormalized" ("startTime");
CREATE INDEX "idx_booking_end_time" ON "BookingTimeStatusDenormalized" ("endTime");
CREATE INDEX "idx_booking_status" ON "BookingTimeStatusDenormalized" ("status");
CREATE INDEX "idx_booking_team_id_team_booking" ON "BookingTimeStatusDenormalized" ("teamId", "isTeamBooking");
CREATE INDEX "idx_booking_user_id_team_booking" ON "BookingTimeStatusDenormalized" ("userId", "isTeamBooking");

-- Function to calculate timeStatus
CREATE OR REPLACE FUNCTION calculate_time_status(
    rescheduled BOOLEAN,
    status "BookingStatus",
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
    BEGIN
        PERFORM refresh_booking_time_status_denormalized(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'DENORM_ERROR: BookingTimeStatusDenormalized - Failed to handle booking change for id %, error: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for booking deletions
CREATE OR REPLACE FUNCTION trigger_delete_booking_time_status_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        DELETE FROM "BookingTimeStatusDenormalized" WHERE id = OLD.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'DENORM_ERROR: BookingTimeStatusDenormalized - Failed to delete denormalized booking id %, error: %', OLD.id, SQLERRM;
    END;
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

-- Function for teamId changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_team_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."teamId" IS DISTINCT FROM OLD."teamId" THEN
        UPDATE "BookingTimeStatusDenormalized" btsd
        SET
            "teamId" = NEW."teamId",
            "isTeamBooking" = calculate_is_team_booking(NEW."teamId")
        WHERE btsd."eventTypeId" = NEW.id
        AND (
            btsd."teamId" IS DISTINCT FROM NEW."teamId"
            OR btsd."isTeamBooking" IS DISTINCT FROM calculate_is_team_booking(NEW."teamId")
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for length changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_length()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.length IS DISTINCT FROM OLD.length THEN
        UPDATE "BookingTimeStatusDenormalized" btsd
        SET "eventLength" = NEW.length
        WHERE btsd."eventTypeId" = NEW.id
        AND btsd."eventLength" IS DISTINCT FROM NEW.length;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for parentId changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_parent_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."parentId" IS DISTINCT FROM OLD."parentId" THEN
        UPDATE "BookingTimeStatusDenormalized" btsd
        SET "eventParentId" = NEW."parentId"
        WHERE btsd."eventTypeId" = NEW.id
        AND btsd."eventParentId" IS DISTINCT FROM NEW."parentId";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create separate triggers for each property on EventType
CREATE TRIGGER event_type_team_id_update_trigger
    AFTER UPDATE OF "teamId" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_team_id();

CREATE TRIGGER event_type_length_update_trigger
    AFTER UPDATE OF length ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_length();

CREATE TRIGGER event_type_parent_id_update_trigger
    AFTER UPDATE OF "parentId" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_parent_id();

-- Create triggers for users table
CREATE OR REPLACE FUNCTION trigger_refresh_booking_time_status_denormalized_user()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        UPDATE "BookingTimeStatusDenormalized" btsd
        SET
            "userEmail" = NEW.email,
            "username" = NEW.username
        WHERE btsd."userId" = NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'DENORM_ERROR: BookingTimeStatusDenormalized - Failed to update user changes for id %, error: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_update_trigger
    AFTER UPDATE OF email, username ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized_user();


-- Populate the table with initial data
-- DELETE FROM "BookingTimeStatusDenormalized";
-- INSERT INTO "BookingTimeStatusDenormalized"
-- SELECT * FROM "BookingTimeStatus";
