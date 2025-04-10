-- Create backup tables
CREATE TABLE IF NOT EXISTS "EventType_backup_20250404" AS SELECT * FROM "EventType";
CREATE TABLE IF NOT EXISTS "_user_eventtype_backup_20250404" AS SELECT * FROM "_user_eventtype";

-- Add verification queries
SELECT COUNT(*) as eventtype_count FROM "EventType";
SELECT COUNT(*) as eventtype_backup_count FROM "EventType_backup_20250404";
SELECT COUNT(*) as user_eventtype_count FROM "_user_eventtype";
SELECT COUNT(*) as user_eventtype_backup_count FROM "_user_eventtype_backup_20250404"; 
