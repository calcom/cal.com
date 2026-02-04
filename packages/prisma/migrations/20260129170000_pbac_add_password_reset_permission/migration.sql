-- Add passwordReset permission to admin role for organizations
-- Owner role already has wildcard permissions (*.*) so no migration needed for it
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('organization', 'passwordReset')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
