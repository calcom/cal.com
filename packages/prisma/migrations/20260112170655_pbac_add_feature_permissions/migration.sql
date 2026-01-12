INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('feature', 'create'),
    ('feature', 'read'),
    ('feature', 'update'),
    ('feature', 'delete')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    ('feature', 'read')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
