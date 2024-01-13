WITH new_profile AS (
  INSERT INTO "Profile" ("uid", "organizationId", "userId", "username", "movedFromUserId", "updatedAt")
  SELECT "id" as "uid", "organizationId", "id" AS "userId", "username", "id" as "movedFromUserId", NOW()
  FROM "users"
  WHERE "organizationId" IS NOT NULL
  RETURNING "uid", "userId", "id"
)
UPDATE "users"
SET "movedToProfileId" = "new_profile"."id"
FROM "new_profile"
WHERE "users"."id" = "new_profile"."userId";