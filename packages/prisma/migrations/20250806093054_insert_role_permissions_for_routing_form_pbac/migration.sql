-- Add routing form permissions for admin role (create, read, update, delete)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('routingForm', 'create'),
    ('routingForm', 'read'),
    ('routingForm', 'update'),
    ('routingForm', 'delete'),
    ('routingForm', 'manage')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Add routing form read permission for member role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    ('routingForm', 'read')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;
