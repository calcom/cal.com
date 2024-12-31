INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'salesforce-crm-tasker',
    false,
    'Whether to use tasker for Salesforce CRM event creation or not on a team/user basis.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
