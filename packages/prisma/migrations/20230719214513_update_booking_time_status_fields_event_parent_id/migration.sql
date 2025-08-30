-- View: public.BookingsTimeStatus

-- DROP VIEW public."BookingsTimeStatus";

CREATE OR REPLACE VIEW public."BookingTimeStatus"
 AS
 SELECT "Booking".id,
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
    "et"."teamId",
	  "et"."length" as "eventLength",
      CASE
          WHEN "Booking".rescheduled IS TRUE THEN 'rescheduled'::text
          WHEN "Booking".status = 'cancelled'::"BookingStatus" AND "Booking".rescheduled IS FALSE THEN 'cancelled'::text
          WHEN "Booking"."endTime" < now() THEN 'completed'::text
          WHEN "Booking"."endTime" > now() THEN 'uncompleted'::text
          ELSE NULL::text
      END AS "timeStatus",
	  "et"."parentId" as "eventParentId"
   FROM "Booking"
    LEFT JOIN "EventType" et ON "Booking"."eventTypeId" = et.id
	  LEFT JOIN "Membership" mb ON "mb"."userId" = "Booking"."userId";
 


