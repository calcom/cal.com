INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('abuse-scoring', false, 'Abuse scoring pipeline for new accounts', 'KILL_SWITCH')
ON CONFLICT (slug) DO NOTHING;
