INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    ('team', 'manageBilling')
) AS permissions(resource, action);
