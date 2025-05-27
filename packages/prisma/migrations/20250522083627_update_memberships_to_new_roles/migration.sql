-- Create default roles
INSERT INTO "Role" (id, name, description, type, "createdAt", "updatedAt")
VALUES 
  ('owner_role', 'Owner', 'Full access to all resources', 'SYSTEM', NOW(), NOW()),
  ('admin_role', 'Admin', 'Administrative access to most resources', 'SYSTEM', NOW(), NOW()),
  ('member_role', 'Member', 'Basic member access', 'SYSTEM', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert permissions for owner role (has access to everything via wildcard)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
VALUES 
  (gen_random_uuid(), 'owner_role', '*', '*', NOW());

-- Insert permissions for admin role
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT 
  gen_random_uuid(), 'admin_role', resource, action, NOW()
FROM (
  VALUES 
    -- Event Type permissions
    ('eventType', 'create'),
    ('eventType', 'read'),
    ('eventType', 'update'),
    ('eventType', 'delete'),
    
    -- Role Permissions
    ('role', 'create'),
    ('role', 'read'),
    ('role', 'update'),
    ('role', 'delete'), 
    
    -- Team permissions
    ('team', 'create'),
    ('team', 'read'),
    ('team', 'update'),
    ('team', 'invite'),
    ('team', 'remove'),
    ('team', 'changeMemberRole'),
    
    -- Organization permissions
    ('organization', 'read'),
    ('organization', 'update'),
    ('organization', 'listMembers'),
    ('organization', 'invite'),
    ('organization', 'remove'),
    ('organization', 'manageBilling'),
    
    -- Booking permissions
    ('booking', 'read'),
    ('booking', 'update'),
    ('booking', 'readTeamBookings'),
    ('booking', 'readOrgBookings'),
    ('booking', 'readRecordings'),
    
    -- Insights permissions
    ('insights', 'read'),
    
    -- Availability permissions
    ('availability', 'read'),
    ('availability', 'update'),
    ('availability', 'override'),
    
    -- Workflow permissions
    ('workflow', 'create'),
    ('workflow', 'read'),
    ('workflow', 'update'),
    ('workflow', 'delete'),
    
    -- Routing Form permissions
    ('routingForm', 'create'),
    ('routingForm', 'read'),
    ('routingForm', 'update'),
    ('routingForm', 'delete'),
    
    -- API Key permissions
    ('apiKey', 'create'),
    ('apiKey', 'read'),
    ('apiKey', 'delete'),
    ('apiKey', 'findKeyOfType')
) AS permissions(resource, action);

-- Insert permissions for member role (basic read access)
INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
SELECT 
  gen_random_uuid(), 'member_role', resource, action, NOW()
FROM (
  VALUES 
    -- Event Type permissions
    ('eventType', 'read'),
    
    -- Team permissions
    ('team', 'read'),

    -- Role Permissions
    ('role', 'read'),
    
    -- Organization permissions
    ('organization', 'read'),
    ('organization', 'listMembers'),
    
    -- Booking permissions
    ('booking', 'read'),
    ('booking', 'update'), -- For their own bookings
    
    -- Availability permissions
    ('availability', 'read'),
    ('availability', 'update'), -- For their own availability
    
    -- Workflow permissions
    ('workflow', 'read'),
    
    -- Routing Form permissions
    ('routingForm', 'read')
) AS permissions(resource, action);

-- Create function to handle membership role changes
-- Keep this is place until we fully depricate old roles
CREATE OR REPLACE FUNCTION update_membership_custom_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customRoleId based on role
    CASE NEW.role
        WHEN 'OWNER' THEN
            NEW."customRoleId" = 'owner_role';
        WHEN 'ADMIN' THEN
            NEW."customRoleId" = 'admin_role';
        WHEN 'MEMBER' THEN
            NEW."customRoleId" = 'member_role';
        ELSE
            -- For any other role, keep the existing customRoleId
            NEW."customRoleId" = NEW."customRoleId";
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -- Create trigger for membership role changes
-- DROP TRIGGER IF EXISTS membership_role_change_trigger ON "Membership";
-- CREATE TRIGGER membership_role_change_trigger
--     BEFORE INSERT OR UPDATE OF role ON "Membership"
--     FOR EACH ROW
--     EXECUTE FUNCTION update_membership_custom_role();

-- -- Update existing memberships to have the correct customRoleId in batches
-- DO $$
-- DECLARE
--     batch_size INTEGER := 5000;
--     max_id INTEGER;
--     current_id INTEGER := 0;
--     affected_rows INTEGER;
-- BEGIN
--     -- Get the maximum id we need to process
--     SELECT COALESCE(MAX(id), 0) INTO max_id FROM "Membership" WHERE "customRoleId" IS NULL;
    
--     -- Process in batches until we've covered all records
--     LOOP
--         UPDATE "Membership"
--         SET "customRoleId" = 
--             CASE role
--                 WHEN 'OWNER' THEN 'owner_role'
--                 WHEN 'ADMIN' THEN 'admin_role'
--                 WHEN 'MEMBER' THEN 'member_role'
--             END
--         WHERE id > current_id
--         AND id <= current_id + batch_size
--         AND "customRoleId" IS NULL;
        
--         GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
--         EXIT WHEN current_id >= max_id;
        
--         current_id := current_id + batch_size;
        
--         -- Optional: Add a small delay between batches if needed
--         -- PERFORM pg_sleep(0.1);
--     END LOOP;
-- END $$;
