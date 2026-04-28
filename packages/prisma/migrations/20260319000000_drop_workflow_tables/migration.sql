-- Drop workflow-related tables and columns (EE feature cleanup)

-- 1. Drop junction/child tables first (they reference parent tables)
DROP TABLE IF EXISTS "WorkflowStepTranslation" CASCADE;
DROP TABLE IF EXISTS "WorkflowReminder" CASCADE;
DROP TABLE IF EXISTS "WorkflowsOnEventTypes" CASCADE;
DROP TABLE IF EXISTS "WorkflowsOnTeams" CASCADE;
DROP TABLE IF EXISTS "WorkflowOptOutContact" CASCADE;
DROP TABLE IF EXISTS "AIPhoneCallConfiguration" CASCADE;

-- 2. Drop WorkflowStep (references Workflow and Agent)
DROP TABLE IF EXISTS "WorkflowStep" CASCADE;

-- 3. Drop Workflow (references User and Team)
DROP TABLE IF EXISTS "Workflow" CASCADE;

-- 4. Remove relation fields from other tables
-- Remove workflows field from EventType (relation-only, no column to drop)
-- Remove aiPhoneCallConfig from EventType (relation-only, no column to drop)
-- Remove workflows from User (relation-only, no column to drop)
ALTER TABLE "users" DROP COLUMN IF EXISTS "whitelistWorkflows";
-- Remove workflows from Team (relation-only, no column to drop)
-- Remove activeOrgWorkflows from Team (relation-only, no column to drop)
-- Remove workflowReminders from Booking (relation-only, no column to drop)
-- Remove workflowStep/inboundWorkflowStep from Agent (relation-only, no column to drop)

-- 5. Drop enum types
DROP TYPE IF EXISTS "WorkflowTriggerEvents";
DROP TYPE IF EXISTS "WorkflowActions";
DROP TYPE IF EXISTS "WorkflowType";
DROP TYPE IF EXISTS "WorkflowTemplates";
DROP TYPE IF EXISTS "WorkflowMethods";
DROP TYPE IF EXISTS "WorkflowStepAutoTranslatedField";
DROP TYPE IF EXISTS "WorkflowContactType";
