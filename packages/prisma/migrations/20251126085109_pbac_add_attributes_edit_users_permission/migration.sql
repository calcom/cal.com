-- Insert editUsers permission for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Attribute editUsers permission
    ('organization.attributes', 'editUsers')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
