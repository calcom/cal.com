-- Add the new "organization.editUsers" permission to admin role
-- Owner role automatically gets it via wildcard (*.*) - no action needed

INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
VALUES
  (gen_random_uuid(), 'admin_role', 'organization', 'editUsers', NOW())
ON CONFLICT DO NOTHING;
