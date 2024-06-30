-- Count how many empty google credentials are in the database
SELECT
  count(*)
FROM
  "Credential" c
WHERE
  "key" = '""'
  AND "type" = 'google_calendar'

  -- Delete empty google credentials
SELECT
  *
FROM
  "Credential" c
DELETE FROM "Credential" c
WHERE
  "key" = '""'
  AND "type" = 'google_calendar' RETURNING *
