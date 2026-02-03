-- Enable PBAC feature flag globally
UPDATE "Feature"
SET enabled = true
WHERE slug = 'pbac';
