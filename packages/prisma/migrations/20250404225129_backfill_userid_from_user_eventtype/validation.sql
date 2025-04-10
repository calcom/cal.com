-- Check for orphaned records in _user_eventtype
SELECT uet.* 
FROM "_user_eventtype" uet
LEFT JOIN "users" u ON uet."B" = u.id
WHERE u.id IS NULL;

-- Check for potential unique constraint violations
SELECT "EventType"."userId", "EventType".slug, COUNT(*) as count
FROM "EventType"
GROUP BY "EventType"."userId", "EventType".slug
HAVING COUNT(*) > 1;

-- Check for data inconsistencies
SELECT et.id, et."userId", uet."B" as user_eventtype_userid
FROM "EventType" et
JOIN "_user_eventtype" uet ON et.id = uet."A"
WHERE et."userId" IS NULL OR et."userId" != uet."B"; 
