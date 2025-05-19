-- This is an empty migration.

-- Update existing memberships to use the new role IDs
UPDATE "Membership"
SET "customRoleId" = CASE 
    WHEN "role" = 'OWNER' THEN 'owner_role'
    WHEN "role" = 'ADMIN' THEN 'admin_role'
    WHEN "role" = 'MEMBER' THEN 'member_role'
    ELSE 'member_role' -- Default to member role for any unexpected values
END
WHERE "customRoleId" IS NULL;
