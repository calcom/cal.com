-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Role_isGlobal_idx" ON "Role"("isGlobal");

-- CreateIndex
CREATE INDEX "Role_isDefault_idx" ON "Role"("isDefault");


-- Insert default roles
INSERT INTO "Role" ("id", "name", "description", "isGlobal", "isDefault", "createdAt", "updatedAt")
VALUES 
  ('owner_role', 'Owner', 'Full access to all team/organization features and settings', true, true, NOW(), NOW()),
  ('admin_role', 'Admin', 'Can manage team/organization settings and members', true, true, NOW(), NOW()),
  ('member_role', 'Member', 'Basic access to team/organization features', true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert permissions for Owner role (full access)
INSERT INTO "RolePermission" ("id", "roleId", "resource", "action", "createdAt")
VALUES 
  ('owner_wildcard', 'owner_role', '*', '*', NOW())
ON CONFLICT DO NOTHING;

-- Insert permissions for Admin role
INSERT INTO "RolePermission" ("id", "roleId", "resource", "action", "createdAt")
VALUES 
  ('admin_booking_all', 'admin_role', 'booking', '*', NOW()),
  ('admin_eventtype_all', 'admin_role', 'eventType', '*', NOW()),
  ('admin_team_invite', 'admin_role', 'team', 'invite', NOW()),
  ('admin_team_remove', 'admin_role', 'team', 'remove', NOW()),
  ('admin_team_role', 'admin_role', 'team', 'changeMemberRole', NOW()),
  ('admin_org_members', 'admin_role', 'organization', 'listMembers', NOW()),
  ('admin_org_read', 'admin_role', 'organization', 'read', NOW()),
  ('admin_org_update', 'admin_role', 'organization', 'update', NOW()),
  ('admin_booking_team', 'admin_role', 'booking', 'readTeamBookings', NOW()),
  ('admin_booking_org', 'admin_role', 'booking', 'readOrgBookings', NOW()),
  ('admin_apikey_all', 'admin_role', 'apiKey', '*', NOW()),
  ('admin_routingform_all', 'admin_role', 'routingForm', '*', NOW()),
  ('admin_workflow_all', 'admin_role', 'workflow', '*', NOW()),
  ('admin_insights_read', 'admin_role', 'insights', 'read', NOW())
ON CONFLICT DO NOTHING;

-- Insert permissions for Member role
INSERT INTO "RolePermission" ("id", "roleId", "resource", "action", "createdAt")
VALUES 
  ('member_booking_read', 'member_role', 'booking', 'read', NOW()),
  ('member_eventtype_read', 'member_role', 'eventType', 'read', NOW()),
  ('member_team_read', 'member_role', 'team', 'read', NOW()),
  ('member_org_read', 'member_role', 'organization', 'read', NOW()),
  ('member_routingform_read', 'member_role', 'routingForm', 'read', NOW())
ON CONFLICT DO NOTHING;
