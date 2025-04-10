-- Check for orphaned records in _user_eventtype
SELECT uet.* 
FROM "_user_eventtype" uet
LEFT JOIN "users" u ON uet."userId" = u.id
WHERE u.id IS NULL;

-- Check for potential unique constraint violations
SELECT userId, slug, COUNT(*) as count
FROM "EventType"
GROUP BY userId, slug
HAVING COUNT(*) > 1;

-- Check for data inconsistencies
SELECT et.id, et."userId", uet."userId" as user_eventtype_userid
FROM "EventType" et
JOIN "_user_eventtype" uet ON et.id = uet."eventTypeId"
WHERE et."userId" IS NULL OR et."userId" != uet."userId"; 
