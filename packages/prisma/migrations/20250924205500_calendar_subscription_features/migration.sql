-- FeatureFlags
INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('calendar-subscription-sync', false, 'Enable calendar subscription synchronization', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('calendar-subscription-cache', false, 'Enable calendar subscription cache', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
