UPDATE "EventType"
SET "userId" = "_user_eventtype"."B"
FROM "_user_eventtype"
WHERE "EventType"."userId" IS NULL
AND "EventType"."teamId" IS NULL
AND "EventType".id = "_user_eventtype"."A";
