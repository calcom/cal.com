INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'policy-acceptance-modal',
    false,
    'Enable policy acceptance modal - Show modal to users when policy is updated',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
