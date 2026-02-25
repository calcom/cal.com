-- Remove Cal.ai Phone Call features (Retell AI integration)

-- Remove agentId and inboundAgentId from WorkflowStep
ALTER TABLE "WorkflowStep" DROP COLUMN IF EXISTS "agentId",
DROP COLUMN IF EXISTS "inboundAgentId";

-- Drop AIPhoneCallConfiguration table (FK references EventType)
DROP TABLE IF EXISTS "AIPhoneCallConfiguration";

-- Drop CalAiPhoneNumber table (FK references Agent, User, Team)
DROP TABLE IF EXISTS "CalAiPhoneNumber";

-- Drop Agent table (FK references User, Team)
DROP TABLE IF EXISTS "Agent";

-- Drop PhoneNumberSubscriptionStatus enum (no longer referenced)
DROP TYPE IF EXISTS "PhoneNumberSubscriptionStatus";
