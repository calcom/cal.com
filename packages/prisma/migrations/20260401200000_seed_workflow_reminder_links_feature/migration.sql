INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('workflow-reminder-links', false, 'OPERATIONAL', 'Enable cancel/reschedule links in workflow reminder emails', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
