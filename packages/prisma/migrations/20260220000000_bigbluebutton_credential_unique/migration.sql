-- Add partial unique indexes to prevent duplicate BigBlueButton credentials.
--
-- A transaction-level find-then-create guard is insufficient under concurrent
-- requests: two requests can both pass the existence check before either
-- commits, resulting in duplicate rows.  A database-level unique index enforces
-- the constraint atomically and causes the second INSERT to fail with a unique
-- constraint violation (Prisma error code P2002), which the application layer
-- converts to an HTTP 422 response.
--
-- Partial indexes (WHERE clause) scope the uniqueness guarantee to
-- bigbluebutton_video credentials only, leaving all other credential types
-- unaffected.  Two separate indexes are needed because:
--   - userId IS NOT NULL  →  user-scoped installation (userId identifies owner)
--   - teamId IS NOT NULL  →  team-scoped installation (teamId identifies owner)
-- In both cases the other column is NULL; a single index over both columns
-- would not enforce the desired constraint.

CREATE UNIQUE INDEX "Credential_bigbluebutton_userId_unique"
  ON "Credential" ("type", "userId")
  WHERE "userId" IS NOT NULL AND "type" = 'bigbluebutton_video';

CREATE UNIQUE INDEX "Credential_bigbluebutton_teamId_unique"
  ON "Credential" ("type", "teamId")
  WHERE "teamId" IS NOT NULL AND "type" = 'bigbluebutton_video';
