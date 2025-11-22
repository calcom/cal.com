-- Add nullable column to cap first N slots per day for an event type
ALTER TABLE "EventType"
ADD COLUMN "firstAvailableSlotsPerDay" INTEGER;


