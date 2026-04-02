INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('organization.customDomain', 'create'),
    ('organization.customDomain', 'read'),
    ('organization.customDomain', 'update'),
    ('organization.customDomain', 'delete')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    ('organization.customDomain', 'read')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
