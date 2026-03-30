INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('custom-smtp-for-orgs', false, 'OPERATIONAL', 'Allow organizations to configure custom SMTP servers for outgoing emails', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
