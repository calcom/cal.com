
DELETE FROM "Host" 
WHERE "Host"."userId" IN ( 
    SELECT "Host"."userId" FROM "Host" 
    LEFT JOIN "Membership" ON "Membership"."userId" = "Host"."userId" 
    INNER JOIN "EventType" ON "EventType"."id" = "Host"."eventTypeId" 
    WHERE "EventType"."teamId" IS NOT NULL 
    AND "Membership"."userId" IS NULL
)
AND "Host"."eventTypeId" IN ( 
    SELECT "Host"."eventTypeId" FROM "Host" 
    LEFT JOIN "Membership" ON "Membership"."userId" = "Host"."userId" 
    INNER JOIN "EventType" ON "EventType"."id" = "Host"."eventTypeId" 
    WHERE "EventType"."teamId" IS NOT NULL 
    AND "Membership"."userId" IS NULL
);