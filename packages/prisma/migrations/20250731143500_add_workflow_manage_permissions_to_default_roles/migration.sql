
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', 'workflow', 'manage', NOW()
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Note: Owner role already has wildcard permissions (*.*) so it inherits workflow manage permissions automatically
