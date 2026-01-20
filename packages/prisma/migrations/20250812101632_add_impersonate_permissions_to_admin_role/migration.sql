-- Add impersonate permissions to admin role
-- These permissions allow administrators to impersonate team and organization members

-- Insert impersonate permissions for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES
    -- Team impersonate permission
    ('team', 'impersonate'),
    
    -- Organization impersonate permission  
    ('organization', 'impersonate')
) AS permissions(resource, action)
ON CONFLICT ("roleId", resource, action) DO NOTHING;

-- Note: Owner role already has wildcard permissions (*.*) so it inherits all impersonate permissions automatically