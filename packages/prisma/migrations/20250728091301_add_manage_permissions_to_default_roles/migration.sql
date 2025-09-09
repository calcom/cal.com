-- Add manage permissions to admin and owner roles
-- These permissions are for organization-level management capabilities

-- Insert manage permissions for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Role management permissions (organization scope)
    ('role', 'manage'),
    
    -- Event Type management permissions (organization scope)
    ('eventType', 'manage'),
    
    -- Team management permissions (organization scope)
    ('team', 'manage'),
    
    -- Booking management permissions (organization scope)
    ('booking', 'manage')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Note: Owner role already has wildcard permissions (*.*) so it inherits all manage permissions automatically