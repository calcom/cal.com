-- Add organization.adminApi permission to admin_role
-- This migration adds the adminApi permission for the organization resource to the default admin role

-- Insert permission for admin role (system role)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
VALUES
  (gen_random_uuid(), 'admin_role', 'organization', 'adminApi', NOW())
ON CONFLICT ("roleId", resource, action) DO NOTHING;