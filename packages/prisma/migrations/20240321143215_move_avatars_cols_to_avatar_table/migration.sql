DO $$
DECLARE
    cur CURSOR FOR SELECT "id", "avatar" FROM "users" WHERE "avatar" IS NOT NULL AND "avatar" != '';
    rec RECORD;
    objectKey UUID;
BEGIN
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        objectKey := gen_random_uuid();

        BEGIN
            INSERT INTO "avatars" ("userId", "data", "objectKey", "teamId")
            VALUES (rec."id", rec."avatar", objectKey, 0)
            ON CONFLICT ("teamId", "userId", "isBanner") DO NOTHING;

            UPDATE "users"
            SET "avatarUrl" = '/api/avatar/' || objectKey || '.png'
            WHERE "id" = rec."id";
        EXCEPTION WHEN UNIQUE_VIOLATION THEN
            -- If there's a unique violation error, do nothing.
        END;
    END LOOP;

    CLOSE cur;
END $$;

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