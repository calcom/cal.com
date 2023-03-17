
DELETE FROM "EventType" WHERE id IN (
    SELECT id FROM "EventType" 
    INNER JOIN _user_eventtype ON "A" = id 
    WHERE "B" IN (
        SELECT "B" FROM "EventType" 
        INNER JOIN _user_eventtype ON "A" = id 
        WHERE "userId" IS NULL AND "teamId" IS NULL 
        GROUP BY slug, "B" HAVING count(*) > 1
    )
    EXCEPT 
    SELECT min(id) FROM "EventType" 
    INNER JOIN _user_eventtype ON "A" = id 
    WHERE "B" IN (
        SELECT "B" FROM "EventType" INNER JOIN _user_eventtype ON "A" = id 
        WHERE "userId" IS NULL AND "teamId" IS NULL 
        GROUP BY slug, "B" HAVING count(*) > 1
    )
    GROUP BY slug, "B"
);

UPDATE "EventType"
SET "userId" = sub."B"
FROM (
    SELECT id, slug, "B" FROM "EventType"
    INNER JOIN _user_eventtype ON "A" = id 
    WHERE "userId" IS NULL AND "teamId" IS NULL
) AS sub
WHERE "EventType".id = sub.id
AND NOT EXISTS (
   SELECT 1 FROM "EventType" WHERE slug = sub.slug AND "userId" = sub."B"
);