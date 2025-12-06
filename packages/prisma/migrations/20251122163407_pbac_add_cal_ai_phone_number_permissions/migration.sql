-- Insert permissions for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Phone number permissions
    ('phoneNumber', 'create'),
    ('phoneNumber', 'read'),
    ('phoneNumber', 'update'),
    ('phoneNumber', 'delete')
) AS permissions(resource, action);

-- Insert permissions for member role (basic read access)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES
    -- Phone number permissions
    ('phoneNumber', 'create'),
    ('phoneNumber', 'read'),
    ('phoneNumber', 'update'),
    ('phoneNumber', 'delete')
) AS permissions(resource, action);