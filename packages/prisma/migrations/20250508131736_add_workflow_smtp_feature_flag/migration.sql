INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'workflow-smtp-emails',
    false,
    'Whether to use SMTP for workflow emails or SendGrid on a team/user basis.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
