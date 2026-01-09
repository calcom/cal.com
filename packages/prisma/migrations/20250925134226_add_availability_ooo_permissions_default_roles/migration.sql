-- Add availability permissions for admin role (create, read, update, delete)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('availability', 'create'),
    ('availability', 'read'),
    ('availability', 'update'),
    ('availability', 'delete')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Add ooo permissions for admin role (create, read, update, delete)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('ooo', 'create'),
    ('ooo', 'read'),
    ('ooo', 'update'),
    ('ooo', 'delete')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Add availability read permission for member role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    ('availability', 'read')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Add ooo read permission for member role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    ('ooo', 'read')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
