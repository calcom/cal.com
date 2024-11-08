SELECT
	to_timestamp(sc."googleChannelExpiration"::bigint / 1000 - 86400)::date as "humanReadableExpireDate",
	sc.*
FROM
	"SelectedCalendar" sc
	LEFT JOIN "users" AS u ON u.id = sc. "userId"
	LEFT JOIN "Membership" AS m ON m. "userId" = u.id
	LEFT JOIN "Team" AS t ON m. "userId" = u.id
	LEFT JOIN "TeamFeatures" AS tf ON tf. "teamId" = t.id
WHERE
	-- Only get calendars for teams where cache is enabled
	tf."featureId" = 'calendar-cache'
	-- We currently only support google watchers
	AND sc."integration" = 'google_calendar'
	AND (
		-- Either is a calendar pending to be watched
    	sc."googleChannelExpiration" IS NULL
		OR (
			-- Or is a calendar that is about to expire
      		sc."googleChannelExpiration" IS NOT NULL
      		-- We substract one day in senconds to renew a day befor expiration
      		AND to_timestamp(sc."googleChannelExpiration"::bigint / 1000 - 86400)::date < CURRENT_TIMESTAMP
    	)
  	);
