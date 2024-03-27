BEGIN;

WITH inserted_avatars AS (
    SELECT u."id", u."avatar" as "data", gen_random_uuid() AS "objectKey"
    FROM "users" u WHERE u."avatar" IS NOT NULL AND u."avatar" != ''
),
inserted AS (
    INSERT INTO "avatars" ("userId", "data", "objectKey", "teamId")
    SELECT "id", "data", "objectKey", 0 AS "teamId"
    FROM inserted_avatars
    ON CONFLICT ("teamId", "userId", "isBanner") DO NOTHING
    RETURNING "userId", "objectKey"
)
UPDATE "users" u
SET "avatarUrl" = '/api/avatar/' || i."objectKey" || '.png'
FROM inserted i
WHERE u."id" = i."userId";

COMMIT;

BEGIN;

WITH inserted_avatars AS (
    SELECT t."id", t."logo" as "data", gen_random_uuid() AS "objectKey"
    FROM "Team" t WHERE t."logo" IS NOT NULL AND t."logo" != ''
),
inserted AS (
    INSERT INTO "avatars" ("teamId", "data", "objectKey", "userId")
    SELECT "id", "data", "objectKey", 0 AS "userId"
    FROM inserted_avatars
    ON CONFLICT ("teamId", "userId", "isBanner") DO NOTHING
    RETURNING "teamId", "objectKey"
)
UPDATE "Team" t
SET "logoUrl" = '/api/avatar/' || i."objectKey" || '.png'
FROM inserted i
WHERE t."id" = i."teamId";

COMMIT;