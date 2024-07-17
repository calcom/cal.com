-- Check all connection activity
SELECT
	*
FROM
	pg_stat_activity;

-- Clear idle connections older than 15 minutes
SELECT
	pg_terminate_backend(pid)
FROM
	pg_stat_activity
WHERE
	state = 'idle'
AND
	state_change < now() - '15min'::INTERVAL;
	
-- Check connections by user
SELECT
	usename,
	count(*)
FROM
	pg_stat_activity
GROUP BY
	usename;
