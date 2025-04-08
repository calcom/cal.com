ALTER TABLE "Membership" ADD COLUMN "createdAt" TIMESTAMP(3),
                         ADD COLUMN "updatedAt" TIMESTAMP(3);

CREATE OR REPLACE FUNCTION update_membership_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."createdAt" = NOW();
    END IF;
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_membership_timestamps
BEFORE INSERT OR UPDATE ON "Membership"
FOR EACH ROW
EXECUTE FUNCTION update_membership_timestamps();
