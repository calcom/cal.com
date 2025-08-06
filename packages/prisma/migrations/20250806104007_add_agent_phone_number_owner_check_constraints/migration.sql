-- Add check constraint for Agent table to ensure at least one owner
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_owner_check" 
  CHECK ("userId" IS NOT NULL OR "teamId" IS NOT NULL);

-- Add check constraint for CalAiPhoneNumber table to ensure at least one owner
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_owner_check"
  CHECK ("userId" IS NOT NULL OR "teamId" IS NOT NULL);