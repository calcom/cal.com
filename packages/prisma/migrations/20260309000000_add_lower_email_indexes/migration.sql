CREATE INDEX IF NOT EXISTS "users_email_lower_idx" ON "public"."users" (LOWER("email"));
CREATE INDEX IF NOT EXISTS "SecondaryEmail_email_lower_idx" ON "public"."SecondaryEmail" (LOWER("email"));
