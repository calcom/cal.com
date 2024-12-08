INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'domain-wide-delegation',
    false,
    'Enable Google Workspace Domain-Wide Delegation - Allows system to act on behalf of Google Workspace users.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
