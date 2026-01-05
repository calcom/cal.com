INSERT INTO "Feature" (slug, type, enabled, metadata, description, "createdAt", "updatedAt")
VALUES (
  'test-experiment',
  'EXPERIMENT',
  true,
  '{"variants":[{"name":"control","percentage":50},{"name":"treatment","percentage":50}],"assignmentType":"DETERMINISTIC"}',
  'Test experiment for playground demo',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  description = EXCLUDED.description,
  "updatedAt" = NOW();
