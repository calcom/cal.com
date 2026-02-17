-- Add booking audit log permissions to admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (VALUES
  ('booking', 'readTeamAuditLogs'),
  ('booking', 'readOrgAuditLogs')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
