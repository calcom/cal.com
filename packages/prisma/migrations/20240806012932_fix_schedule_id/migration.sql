--- Migration to fix affected event types where the scheduleId is set where-
--- host schedules should be used instead.
UPDATE "EventType"
SET "scheduleId" = NULL
WHERE "scheduleId" IS NOT NULL 
  AND "teamId" IS NOT NULL
  AND (
    ("metadata"->'config'->>'useHostSchedulesForTeamEvent') IS NULL
    OR ("metadata"->'config'->>'useHostSchedulesForTeamEvent') IN ('true')
  );