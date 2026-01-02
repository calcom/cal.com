-- 1. Add nullable columns (fast, metadata-only)
ALTER TABLE "public"."users"
ADD COLUMN email_domain TEXT;

ALTER TABLE "public"."SecondaryEmail"
ADD COLUMN email_domain TEXT;

-- 2. Trigger function (shared)
CREATE OR REPLACE FUNCTION set_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND STRPOS(NEW.email, '@') > 0 THEN
    NEW.email_domain := LOWER(SUBSTR(NEW.email, STRPOS(NEW.email, '@') + 1));
  ELSE
    NEW.email_domain := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Triggers (future correctness only)
DROP TRIGGER IF EXISTS trg_user_email_domain ON "users";
CREATE TRIGGER trg_user_email_domain
BEFORE INSERT OR UPDATE OF email ON "users"
FOR EACH ROW EXECUTE FUNCTION set_email_domain();

DROP TRIGGER IF EXISTS trg_secondary_email_domain ON "SecondaryEmail";
CREATE TRIGGER trg_secondary_email_domain
BEFORE INSERT OR UPDATE OF email ON "SecondaryEmail"
FOR EACH ROW EXECUTE FUNCTION set_email_domain();
