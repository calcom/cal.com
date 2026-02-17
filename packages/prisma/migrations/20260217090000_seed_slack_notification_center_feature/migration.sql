INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('slack-notification-center', false, 'Enables the Slack notification center integration for receiving Cal.com event notifications in Slack channels.', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
