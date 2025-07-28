SELECT
  r.id,
  r.response,
  (
    SELECT
      jsonb_object_agg(
        jsonb_each.key,
        CASE
          WHEN (
            jsonb_typeof((jsonb_each.value -> 'value' :: text)) = 'string' :: text
          ) THEN jsonb_build_object(
            'label',
            (jsonb_each.value -> 'label' :: text),
            'value',
            lower((jsonb_each.value ->> 'value' :: text))
          )
          ELSE jsonb_each.value
        END
      ) AS jsonb_object_agg
    FROM
      jsonb_each(r.response) jsonb_each(KEY, value)
  ) AS "responseLowercase",
  f.id AS "formId",
  f.name AS "formName",
  f."teamId" AS "formTeamId",
  f."userId" AS "formUserId",
  b.uid AS "bookingUid",
  b.status AS "bookingStatus",
  CASE
    b.status
    WHEN 'accepted' :: "BookingStatus" THEN 1
    WHEN 'pending' :: "BookingStatus" THEN 2
    WHEN 'awaiting_host' :: "BookingStatus" THEN 3
    WHEN 'cancelled' :: "BookingStatus" THEN 4
    WHEN 'rejected' :: "BookingStatus" THEN 5
    ELSE NULL :: integer
  END AS "bookingStatusOrder",
  b."createdAt" AS "bookingCreatedAt",
  b."startTime" AS "bookingStartTime",
  b."endTime" AS "bookingEndTime",
  (
    SELECT
      json_agg(
        json_build_object(
          'name',
          a.name,
          'timeZone',
          a."timeZone",
          'email',
          a.email
        )
      ) AS json_agg
    FROM
      "Attendee" a
    WHERE
      (a."bookingId" = b.id)
  ) AS "bookingAttendees",
  u.id AS "bookingUserId",
  u.name AS "bookingUserName",
  u.email AS "bookingUserEmail",
  u."avatarUrl" AS "bookingUserAvatarUrl",
  COALESCE(
    (
      SELECT
        ar."reasonString"
      FROM
        "AssignmentReason" ar
      WHERE
        (ar."bookingId" = b.id)
      LIMIT
        1
    ), '' :: text
  ) AS "bookingAssignmentReason",
  COALESCE(
    (
      SELECT
        lower(ar."reasonString") AS lower
      FROM
        "AssignmentReason" ar
      WHERE
        (ar."bookingId" = b.id)
      LIMIT
        1
    ), '' :: text
  ) AS "bookingAssignmentReasonLowercase",
  r."createdAt",
  t.utm_source,
  t.utm_medium,
  t.utm_campaign,
  t.utm_term,
  t.utm_content
FROM
  (
    (
      (
        (
          "App_RoutingForms_FormResponse" r
          LEFT JOIN "App_RoutingForms_Form" f ON ((r."formId" = f.id))
        )
        LEFT JOIN "Booking" b ON ((r."routedToBookingUid" = b.uid))
      )
      LEFT JOIN users u ON ((b."userId" = u.id))
    )
    LEFT JOIN "Tracking" t ON ((t."bookingId" = b.id))
  );