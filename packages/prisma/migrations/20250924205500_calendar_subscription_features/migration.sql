-- FeatureFlags
INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('calendar-subscription-sync', false, 'Enable calendar subscription syncronization', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('calendar-subscription-cache', false, 'Enable calendar subscription cache', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
