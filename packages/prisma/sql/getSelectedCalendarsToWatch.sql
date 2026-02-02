SELECT
  TO_TIMESTAMP(sc."googleChannelExpiration"::bigint / 1000 - 86400)::date as "humanReadableExpireDate",
  sc.*
FROM
  "SelectedCalendar" sc
  LEFT JOIN "users" AS u ON u.id = sc. "userId"
  LEFT JOIN "Membership" AS m ON m. "userId" = u.id
  LEFT JOIN "Team" AS t ON t.id = m."teamId"
  LEFT JOIN "TeamFeatures" AS tf ON tf. "teamId" = t.id
WHERE
  -- Only get calendars for teams where cache is enabled
  tf."featureId" = 'calendar-cache'
  AND tf.enabled = true
  -- We currently only support google watchers
  AND sc."integration" = 'google_calendar'
  AND (
    -- Either is a calendar pending to be watched
      sc."googleChannelExpiration" IS NULL
    OR (
      -- Or is a calendar that is about to expire
          sc."googleChannelExpiration" IS NOT NULL
          -- We substract one day in seconds to renew a day before expiration
          AND TO_TIMESTAMP(sc."googleChannelExpiration"::bigint / 1000 - 86400)::date < CURRENT_TIMESTAMP
      )
    );
