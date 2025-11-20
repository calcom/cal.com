-- Insert system actor with predefined UUID
-- This actor is used for system-initiated booking actions
INSERT INTO "AuditActor" (
  id,
  type,
  "userUuid",
  "attendeeId",
  email,
  phone,
  name,
  "createdAt"
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system',
  NULL,
  NULL,
  NULL,
  NULL,
  'System',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
