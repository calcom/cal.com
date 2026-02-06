INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('sidebar-tips', false, 'Enables the tips section in the sidebar.', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
