-- Function to calculate isTeamBooking
CREATE OR REPLACE FUNCTION calculate_is_team_booking(team_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN team_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh a single booking's data
CREATE OR REPLACE FUNCTION refresh_booking_time_status_denormalized(booking_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing entry if any
    DELETE FROM "BookingDenormalized" WHERE id = booking_id;

    -- Insert a denormalized booking joined with EventType and user
    INSERT INTO "BookingDenormalized" (
        id,
        uid,
        "eventTypeId",
        title,
        description,
        "startTime",
        "endTime",
        "createdAt",
        "updatedAt",
        location,
        paid,
        status,
        rescheduled,
        "userId",
        "teamId",
        "eventLength",
        "eventParentId",
        "userEmail",
        "userName",
        "userUsername",
        "ratingFeedback",
        "rating",
        "noShowHost",
        "isTeamBooking"
    )
    SELECT
        "Booking".id,
        "Booking".uid,
        "Booking"."eventTypeId",
        "Booking".title,
        "Booking".description,
        "Booking"."startTime",
        "Booking"."endTime",
        "Booking"."createdAt",
        "Booking"."updatedAt",
        "Booking".location,
        "Booking".paid,
        "Booking".status,
        "Booking".rescheduled,
        "Booking"."userId",
        et."teamId",
        et.length AS "eventLength",
        et."parentId" AS "eventParentId",
        "u"."email" AS "userEmail",
        "u"."name" AS "userName",
        "u"."username" AS "userUsername",
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
        RAISE WARNING 'DENORM_ERROR: BookingDenormalized - Failed to handle booking change for id %', NEW.id;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for booking deletions
CREATE OR REPLACE FUNCTION trigger_delete_booking_time_status_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        DELETE FROM "BookingDenormalized" WHERE id = OLD.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'DENORM_ERROR: BookingDenormalized - Failed to delete denormalized booking id %', OLD.id;
    END;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for Booking table
CREATE TRIGGER booking_denorm_booking_insert_update_trigger
    AFTER INSERT OR UPDATE ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized();

CREATE TRIGGER booking_denorm_booking_delete_trigger
    AFTER DELETE ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_booking_time_status_denormalized();

-- Function for teamId changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_team_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "BookingDenormalized" btsd
    SET
        "teamId" = NEW."teamId",
        "isTeamBooking" = calculate_is_team_booking(NEW."teamId")
    WHERE btsd."eventTypeId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for length changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_length()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "BookingDenormalized" btsd
    SET "eventLength" = NEW.length
    WHERE btsd."eventTypeId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for parentId changes on EventType
CREATE OR REPLACE FUNCTION refresh_booking_time_status_parent_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "BookingDenormalized" btsd
    SET "eventParentId" = NEW."parentId"
    WHERE btsd."eventTypeId" = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create separate triggers for each property on EventType
CREATE TRIGGER booking_denorm_event_type_team_id_update_trigger
    AFTER UPDATE OF "teamId" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_team_id();

CREATE TRIGGER booking_denorm_event_type_length_update_trigger
    AFTER UPDATE OF length ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_length();

CREATE TRIGGER booking_denorm_event_type_parent_id_update_trigger
    AFTER UPDATE OF "parentId" ON "EventType"
    FOR EACH ROW
    EXECUTE FUNCTION refresh_booking_time_status_parent_id();

-- Create triggers for users table
CREATE OR REPLACE FUNCTION trigger_refresh_booking_time_status_denormalized_user()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        UPDATE "BookingDenormalized" btsd
        SET
            "userEmail" = NEW.email,
            "userName" = NEW.name,
            "userUsername" = NEW.username
        WHERE btsd."userId" = NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'DENORM_ERROR: BookingDenormalized - Failed to update user changes for id %', NEW.id;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_denorm_user_update_trigger
    AFTER UPDATE OF email, name, username ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_booking_time_status_denormalized_user();

-- Populate the table with initial data
-- DELETE FROM "BookingDenormalized";
-- INSERT INTO "BookingDenormalized"
-- SELECT * FROM "BookingTimeStatus";
