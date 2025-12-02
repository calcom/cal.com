-- Add holidays feature flag
INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('holidays', false, 'Enable holidays feature to automatically block availability on public holidays', 'EXPERIMENT')
ON CONFLICT (slug) DO NOTHING;

