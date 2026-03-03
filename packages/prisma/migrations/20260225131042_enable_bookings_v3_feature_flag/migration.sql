UPDATE "Feature"
SET enabled = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'bookings-v3';
