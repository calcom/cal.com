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
        "isTeamBooking",
        "calIdTeamId"
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
        calculate_is_team_booking(et."calIdTeamId") as "isTeamBooking",
        et."calIdTeamId"
    FROM "Booking"
    LEFT JOIN "EventType" et ON "Booking"."eventTypeId" = et.id
    LEFT JOIN users u ON u.id = "Booking"."userId"
    WHERE "Booking".id = booking_id;
END;
$$ LANGUAGE plpgsql;
