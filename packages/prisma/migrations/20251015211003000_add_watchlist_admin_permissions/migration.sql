INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(),
  'admin_role',
  resource,
  action,
  NOW()
FROM (
  VALUES
    ('watchlist', 'create'),
    ('watchlist', 'read'),
    ('watchlist', 'update'),
    ('watchlist', 'delete')
) AS permissions (resource, action);
