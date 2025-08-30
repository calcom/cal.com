-- Insert initial feature flags with their default values
INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'insights',
    true,
    'Enable insights for this instance',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
