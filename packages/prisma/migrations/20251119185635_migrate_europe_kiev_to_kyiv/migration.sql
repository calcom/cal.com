/*
  Warnings:

  - Migrating timezone from 'Europe/Kiev' to 'Europe/Kyiv' across all tables.
  - The IANA timezone database deprecated 'Europe/Kiev' in favor of 'Europe/Kyiv'.
  - This migration updates all existing records to use the new timezone identifier.

*/

-- Update User table (mapped to 'users' in database)
UPDATE "users"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

-- Update Team table
UPDATE "Team"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

-- Update EventType table
UPDATE "EventType"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

-- Update Attendee table
UPDATE "Attendee"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

-- Update TravelSchedule table (both timeZone and prevTimeZone fields)
UPDATE "TravelSchedule"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

UPDATE "TravelSchedule"
SET "prevTimeZone" = 'Europe/Kyiv'
WHERE "prevTimeZone" = 'Europe/Kiev';

-- Update Schedule table
UPDATE "Schedule"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

-- Update CalendarCacheEvent table
UPDATE "CalendarCacheEvent"
SET "timeZone" = 'Europe/Kyiv'
WHERE "timeZone" = 'Europe/Kiev';

