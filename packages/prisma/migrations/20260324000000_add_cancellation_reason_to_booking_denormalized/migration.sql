-- Add cancellationReason column to BookingDenormalized
ALTER TABLE "BookingDenormalized" ADD COLUMN "cancellationReason" TEXT;

-- Backfill cancellationReason from Booking table
UPDATE "BookingDenormalized" bd
SET "cancellationReason" = b."cancellationReason"
FROM "Booking" b
WHERE bd.id = b.id AND b."cancellationReason" IS NOT NULL;

-- Update the refresh function to include cancellationReason
CREATE OR REPLACE FUNCTION refresh_booking_time_status_denormalized(booking_id INTEGER)
RETURNS VOID AS $$
BEGIN
    DELETE FROM "BookingDenormalized" WHERE id = booking_id;

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
        "cancellationReason"
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
        calculate_is_team_booking(et."teamId") as "isTeamBooking",
        "Booking"."cancellationReason"
    FROM "Booking"
    LEFT JOIN "EventType" et ON "Booking"."eventTypeId" = et.id
    LEFT JOIN users u ON u.id = "Booking"."userId"
    WHERE "Booking".id = booking_id;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the BookingTimeStatusDenormalized view to include cancellationReason
-- (CREATE OR REPLACE VIEW cannot add columns before existing ones)
DROP VIEW IF EXISTS public."BookingTimeStatusDenormalized";
CREATE VIEW public."BookingTimeStatusDenormalized" AS
SELECT
    *,
    CASE
        WHEN "rescheduled" IS TRUE THEN 'rescheduled'
        WHEN "status" = 'cancelled'::public."BookingStatus" AND "rescheduled" IS NULL THEN 'cancelled'
        WHEN "endTime" < now() THEN 'completed'
        WHEN "endTime" > now() THEN 'uncompleted'
        ELSE NULL
    END as "timeStatus"
FROM public."BookingDenormalized";
