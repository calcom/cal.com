-- Insert initial feature flags with their default values
INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'emails',
    false,
    'Enable to prevent any emails being send',
    'KILL_SWITCH'
  ),
  (
    'workflows',
    true,
    'Enable workflows for this instance',
    'OPERATIONAL'
  ),
  (
    'teams',
    true,
    'Enable teams for this instance',
    'OPERATIONAL'
  ),
  (
    'webhooks',
    true,
    'Enable webhooks for this instance',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
