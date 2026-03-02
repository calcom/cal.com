-- Add SIGNUP to WatchlistSource enum
ALTER TYPE "WatchlistSource" ADD VALUE IF NOT EXISTS 'SIGNUP';

-- Seed the signup-watchlist-review feature flag
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('signup-watchlist-review', false, 'OPERATIONAL', 'When enabled, new signups are added to the watchlist for review', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
