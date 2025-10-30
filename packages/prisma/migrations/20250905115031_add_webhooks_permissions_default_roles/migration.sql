-- Add webhook permissions for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Attribute permissions
    ('webhook', 'create'),
    ('webhook', 'read'),
    ('webhook', 'update'),
    ('webhook', 'delete')
) AS permissions(resource, action);

-- Add read permission for member role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    -- Attribute permissions - read only
    ('webhook', 'read')
) AS permissions(resource, action);
