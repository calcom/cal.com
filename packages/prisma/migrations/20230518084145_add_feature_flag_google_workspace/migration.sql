INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'google-workspace-directory',
    false,
    'Enable Google Workspace Directory integration - Syncing of users and groups from Google Workspace to users teams.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
