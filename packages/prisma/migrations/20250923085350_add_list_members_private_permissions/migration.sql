-- This permission allows admin users to view members of private teams and organizations

INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Team listMembersPrivate permission
    ('team', 'listMembersPrivate'),

    -- Organization listMembersPrivate permission
    ('organization', 'listMembersPrivate')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Note: Owner role already has wildcard permissions (*.*) so it inherits all listMembersPrivate permissions automatically
