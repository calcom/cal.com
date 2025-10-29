INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('calendar-subscription-cache-read', false, 'Enable calendar subscription cache read', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
