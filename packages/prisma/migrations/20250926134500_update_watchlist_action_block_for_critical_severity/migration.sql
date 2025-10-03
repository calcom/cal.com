-- Update Watchlist.action = BLOCK where severity = CRITICAL
UPDATE "Watchlist"
SET "action" = 'BLOCK'
WHERE "severity" = 'CRITICAL';
