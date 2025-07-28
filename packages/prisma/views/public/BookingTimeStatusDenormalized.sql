SELECT
  "BookingDenormalized".id,
  "BookingDenormalized".uid,
  "BookingDenormalized"."eventTypeId",
  "BookingDenormalized".title,
  "BookingDenormalized".description,
  "BookingDenormalized"."startTime",
  "BookingDenormalized"."endTime",
  "BookingDenormalized"."createdAt",
  "BookingDenormalized"."updatedAt",
  "BookingDenormalized".location,
  "BookingDenormalized".paid,
  "BookingDenormalized".status,
  "BookingDenormalized".rescheduled,
  "BookingDenormalized"."userId",
  "BookingDenormalized"."teamId",
  "BookingDenormalized"."eventLength",
  "BookingDenormalized"."eventParentId",
  "BookingDenormalized"."userEmail",
  "BookingDenormalized"."userName",
  "BookingDenormalized"."userUsername",
  "BookingDenormalized"."ratingFeedback",
  "BookingDenormalized".rating,
  "BookingDenormalized"."noShowHost",
  "BookingDenormalized"."isTeamBooking",
  CASE
    WHEN ("BookingDenormalized".rescheduled IS TRUE) THEN 'rescheduled' :: text
    WHEN (
      (
        "BookingDenormalized".status = 'cancelled' :: "BookingStatus"
      )
      AND ("BookingDenormalized".rescheduled IS NULL)
    ) THEN 'cancelled' :: text
    WHEN ("BookingDenormalized"."endTime" < NOW()) THEN 'completed' :: text
    WHEN ("BookingDenormalized"."endTime" > NOW()) THEN 'uncompleted' :: text
    ELSE NULL :: text
  END AS "timeStatus"
FROM
  "BookingDenormalized";